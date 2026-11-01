import csv
import io
import hashlib
import platform
import statistics
import sys
import time
import tracemalloc
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import BenchmarkExperiment
from .serializers import BenchmarkExperimentSerializer, RunBenchmarkSerializer
from apps.authentication.permissions import IsCentralAdministrator

class BenchmarkListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    queryset = BenchmarkExperiment.objects.all()
    serializer_class = BenchmarkExperimentSerializer

class RunBenchmarkSimulationView(APIView):
    permission_classes = [IsCentralAdministrator]

    def post(self, request):
        serializer = RunBenchmarkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workload_size = serializer.validated_data['workload_size']
        consensus_type = serializer.validated_data['consensus_type']

        # This measures local CPU work only. It does not represent EVM gas or block time.
        latencies_ms = []
        tracemalloc.start()
        process_started = time.process_time()
        wall_started = time.perf_counter()
        for index in range(workload_size):
            item_started = time.perf_counter_ns()
            if consensus_type == BenchmarkExperiment.ConsensusType.POW_BASELINE:
                nonce = 0
                while True:
                    digest = hashlib.sha256(f'lightvote-pow:{index}:{nonce}'.encode()).digest()
                    if digest[0] == 0:
                        break
                    nonce += 1
            else:
                payload = f'lightvote-local-validation:{index}'.encode()
                commitment = hashlib.sha256(payload).digest()
                if hashlib.sha256(payload).digest() != commitment:
                    raise RuntimeError('Local commitment verification failed.')
            latencies_ms.append((time.perf_counter_ns() - item_started) / 1_000_000)
        elapsed_sec = max(time.perf_counter() - wall_started, 1e-9)
        cpu_sec = time.process_time() - process_started
        _, peak_bytes = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        sorted_latencies = sorted(latencies_ms)
        p95_index = max(0, min(len(sorted_latencies) - 1, int((len(sorted_latencies) - 1) * 0.95)))
        avg_latency = statistics.fmean(latencies_ms)
        p95_latency = sorted_latencies[p95_index]
        avg_verification = avg_latency

        experiment = BenchmarkExperiment.objects.create(
            name=f"Measured local CPU simulation ({workload_size} operations)",
            consensus_type=consensus_type,
            workload_size=workload_size,
            batch_size=10,
            avg_latency_ms=round(avg_latency, 4),
            p95_latency_ms=round(p95_latency, 4),
            block_confirmation_time_sec=0,
            avg_gas_used=0,
            total_gas_used=0,
            throughput_tps=round(workload_size / elapsed_sec, 4),
            verification_time_ms=round(avg_verification, 4),
            cpu_usage_pct=round((cpu_sec / elapsed_sec) * 100, 2),
            memory_usage_mb=round(peak_bytes / (1024 * 1024), 4),
            storage_kb_per_tx=round(len(f'lightvote-local-validation:{workload_size}'.encode()) / 1024, 4),
            network_info='Local process CPU benchmark (no chain transactions submitted)',
            environment_info=f'Python {sys.version.split()[0]} / {platform.platform()}',
            measurement_source=BenchmarkExperiment.MeasurementSource.LOCAL_SIMULATION,
        )

        return Response(BenchmarkExperimentSerializer(experiment).data, status=status.HTTP_201_CREATED)

class ExportBenchmarkCSVView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        experiments = BenchmarkExperiment.objects.all()

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="lightvote_benchmark_metrics.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Experiment ID', 'Name', 'Consensus Architecture', 'Workload (Tx Count)',
            'Batch Size', 'Avg Latency (ms)', 'P95 Latency (ms)',
            'Block Confirmation Time (s)', 'Avg Gas (Units)', 'Total Gas',
            'Throughput (TPS)', 'Verification Time (ms)', 'CPU Usage (%)',
            'Memory Usage (MB)', 'Storage (KB/Tx)', 'Network Environment', 'Measurement Source', 'Timestamp'
        ])

        for exp in experiments:
            writer.writerow([
                exp.id,
                exp.name,
                exp.get_consensus_type_display(),
                exp.workload_size,
                exp.batch_size,
                exp.avg_latency_ms,
                exp.p95_latency_ms,
                exp.block_confirmation_time_sec,
                exp.avg_gas_used,
                exp.total_gas_used,
                exp.throughput_tps,
                exp.verification_time_ms,
                exp.cpu_usage_pct,
                exp.memory_usage_mb,
                exp.storage_kb_per_tx,
                exp.network_info,
                exp.measurement_source,
                exp.created_at.isoformat()
            ])

        return response

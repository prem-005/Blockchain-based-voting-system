from rest_framework import serializers
from .models import BenchmarkExperiment

class RunBenchmarkSerializer(serializers.Serializer):
    workload_size = serializers.IntegerField(min_value=1, max_value=1000, default=50)
    consensus_type = serializers.ChoiceField(choices=BenchmarkExperiment.ConsensusType.choices)

class BenchmarkExperimentSerializer(serializers.ModelSerializer):
    consensus_type_display = serializers.CharField(source='get_consensus_type_display', read_only=True)

    class Meta:
        model = BenchmarkExperiment
        fields = [
            'id', 'name', 'consensus_type', 'consensus_type_display',
            'workload_size', 'batch_size', 'avg_latency_ms', 'p95_latency_ms',
            'block_confirmation_time_sec', 'avg_gas_used', 'total_gas_used',
            'throughput_tps', 'verification_time_ms', 'cpu_usage_pct',
            'memory_usage_mb', 'storage_kb_per_tx', 'network_info',
            'environment_info', 'created_at', 'measurement_source'
        ]

from django.db import models

class BenchmarkExperiment(models.Model):
    class MeasurementSource(models.TextChoices):
        DEVELOPMENT_SEED = 'DEVELOPMENT_SEED', 'Development seed data'
        LOCAL_SIMULATION = 'LOCAL_SIMULATION', 'Measured local simulation'
        CHAIN_TRANSACTION = 'CHAIN_TRANSACTION', 'Measured chain transaction'

    class ConsensusType(models.TextChoices):
        LIGHTWEIGHT = 'LIGHTWEIGHT_VALIDATOR', 'Lightweight Multi-Validator (LightVote)'
        POW_BASELINE = 'POW_BASELINE', 'Proof-of-Work Baseline'
        POA_TESTNET = 'POA_TESTNET', 'Proof-of-Authority Testnet'

    name = models.CharField(max_length=150)
    consensus_type = models.CharField(max_length=30, choices=ConsensusType.choices)
    workload_size = models.PositiveIntegerField(help_text="Number of transactions (e.g. 10, 50, 100, 500, 1000)")
    batch_size = models.PositiveIntegerField(default=10)
    avg_latency_ms = models.FloatField(help_text="Average end-to-end transaction latency in ms")
    p95_latency_ms = models.FloatField(help_text="95th percentile latency in ms")
    block_confirmation_time_sec = models.FloatField(help_text="Average block confirmation time in seconds")
    avg_gas_used = models.PositiveIntegerField(help_text="Average gas units consumed per transaction")
    total_gas_used = models.BigIntegerField()
    throughput_tps = models.FloatField(help_text="Transactions per second (TPS)")
    verification_time_ms = models.FloatField(help_text="Time to verify Merkle proof and receipt in ms")
    cpu_usage_pct = models.FloatField(default=12.5)
    memory_usage_mb = models.FloatField(default=180.0)
    storage_kb_per_tx = models.FloatField(default=0.45)
    network_info = models.CharField(max_length=100, default="Hardhat Node (EVM Berlin/Shanghai)")
    environment_info = models.TextField(default="Node v24.19.0, Python 3.14, Windows 64-bit")
    measurement_source = models.CharField(max_length=24, choices=MeasurementSource.choices, default=MeasurementSource.DEVELOPMENT_SEED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} [{self.get_consensus_type_display()}] - {self.workload_size} txs ({self.throughput_tps} TPS)"

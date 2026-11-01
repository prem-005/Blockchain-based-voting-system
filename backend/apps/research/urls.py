from django.urls import path
from .views import BenchmarkListView, RunBenchmarkSimulationView, ExportBenchmarkCSVView

urlpatterns = [
    path('benchmarks/', BenchmarkListView.as_view(), name='benchmark-list'),
    path('run-simulation/', RunBenchmarkSimulationView.as_view(), name='run-simulation'),
    path('export-csv/', ExportBenchmarkCSVView.as_view(), name='export-benchmark-csv'),
]

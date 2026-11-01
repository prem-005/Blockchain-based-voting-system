import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Download, 
  Play, 
  Layers, 
  Zap, 
  Clock, 
  BarChart3, 
  CheckCircle2, 
  TrendingUp, 
  HardDrive,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { apiUrl } from '../services/apiClient';
import { BenchmarkMetric } from '../types';

export const ResearchDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<BenchmarkMetric[]>([]);
  const [workloadSize, setWorkloadSize] = useState<number>(50);
  const [consensusType, setConsensusType] = useState<string>('LIGHTWEIGHT_VALIDATOR');
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchBenchmarks = async () => {
    try {
      const data = await apiRequest('/research/benchmarks/');
      setMetrics(data.results || data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  const handleRunExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    try {
      await apiRequest('/research/run-simulation/', {
        method: 'POST',
        body: JSON.stringify({ workload_size: workloadSize, consensus_type: consensusType })
      });
      fetchBenchmarks();
    } catch (err: any) {
      alert(err.message || 'Simulation run failed.');
    } finally {
      setRunning(false);
    }
  };

  // Split into Lightweight and PoW
  const measuredMetrics = metrics.filter(m => m.measurement_source !== 'DEVELOPMENT_SEED');
  const lightweightRuns = measuredMetrics.filter(m => m.consensus_type === 'LIGHTWEIGHT_VALIDATOR');
  const powRuns = measuredMetrics.filter(m => m.consensus_type === 'POW_BASELINE');
  const mean = (rows: BenchmarkMetric[], field: keyof BenchmarkMetric) => rows.length
    ? Number((rows.reduce((sum, row) => sum + Number(row[field] || 0), 0) / rows.length).toFixed(2))
    : null;
  const display = (value: number | null, unit: string) => value === null ? 'No measurements' : `${value.toLocaleString()} ${unit}`;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-50 text-accent-700 text-xs font-semibold rounded-full border border-accent-200 mb-2">
            <Cpu className="w-4 h-4 text-accent-600" />
            <span>Academic Performance Evaluation</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Research & Benchmarking Dashboard
          </h1>
          <p className="text-slate-500 text-xs">
            Recorded measurements are labeled by source. Local CPU simulations do not represent chain gas or confirmation time.
          </p>
        </div>

        {/* CSV Export Button */}
        <a
          href={apiUrl('/research/export-csv/')}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Research CSV Data</span>
        </a>
      </div>

      {/* Simulator Run Control Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Play className="w-4 h-4 text-brand-600" />
          <span>Execute Controlled Workload Experiment</span>
        </h2>
        <form onSubmit={handleRunExperiment} className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Workload Size:</span>
            <select
              value={workloadSize}
              onChange={(e) => setWorkloadSize(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
            >
              <option value="10">10 Transactions (Micro)</option>
              <option value="50">50 Transactions (Standard)</option>
              <option value="100">100 Transactions (Medium)</option>
              <option value="500">500 Transactions (High)</option>
              <option value="1000">1,000 Transactions (Peak Load)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Consensus Model:</span>
            <select
              value={consensusType}
              onChange={(e) => setConsensusType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
            >
              <option value="LIGHTWEIGHT_VALIDATOR">Lightweight Multi-Validator (LightVote)</option>
              <option value="POW_BASELINE">Proof-of-Work Baseline (PoW)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={running}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-2 ml-auto"
          >
            <Activity className="w-4 h-4 text-accent-400" />
            <span>{running ? 'Running Experiment...' : 'Run Workload Test'}</span>
          </button>
        </form>
      </div>

      {/* Comparative Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase">Tx Latency</span>
            <Clock className="w-4 h-4 text-brand-600" />
          </div>
          <div className="pt-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-emerald-700 font-bold">LightVote:</span>
              <span className="mono font-extrabold text-slate-900 text-base">{display(mean(lightweightRuns, 'avg_latency_ms'), 'ms')}</span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-400">
              <span>PoW Baseline:</span>
              <span className="mono font-semibold">{display(mean(powRuns, 'avg_latency_ms'), 'ms')}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase">Throughput (TPS)</span>
            <Zap className="w-4 h-4 text-accent-600" />
          </div>
          <div className="pt-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-emerald-700 font-bold">LightVote:</span>
              <span className="mono font-extrabold text-slate-900 text-base">{display(mean(lightweightRuns, 'throughput_tps'), 'ops/s')}</span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-400">
              <span>PoW Baseline:</span>
              <span className="mono font-semibold">{display(mean(powRuns, 'throughput_tps'), 'ops/s')}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase">Gas Consumed / Tx</span>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="pt-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-emerald-700 font-bold">LightVote:</span>
              <span className="mono font-extrabold text-slate-900 text-base">{display(mean(metrics.filter(m => m.measurement_source === 'CHAIN_TRANSACTION'), 'avg_gas_used'), 'units')}</span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-400">
              <span>PoW Baseline:</span>
              <span className="mono font-semibold">Not measured in local CPU simulations</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase">Proof Verification</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="pt-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-emerald-700 font-bold">LightVote:</span>
              <span className="mono font-extrabold text-slate-900 text-base">{display(mean(lightweightRuns, 'verification_time_ms'), 'ms')}</span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-400">
              <span>PoW Baseline:</span>
              <span className="mono font-semibold">{display(mean(powRuns, 'verification_time_ms'), 'ms')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparative Data Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Recorded Empirical Datasets ({metrics.length} Experiments)
          </h2>
          <span className="text-xs text-slate-400">Development seed rows are identified by source</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                <th className="pb-3 font-semibold">Experiment</th>
                <th className="pb-3 font-semibold">Source</th>
                <th className="pb-3 font-semibold">Consensus Model</th>
                <th className="pb-3 font-semibold">Tx Workload</th>
                <th className="pb-3 font-semibold">Avg Latency</th>
                <th className="pb-3 font-semibold">Throughput</th>
                <th className="pb-3 font-semibold">Avg Gas</th>
                <th className="pb-3 font-semibold">Block Conf</th>
                <th className="pb-3 font-semibold text-right">CPU / RAM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map((m) => {
                const isLight = m.consensus_type === 'LIGHTWEIGHT_VALIDATOR';
                return (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-medium text-slate-900">
                      {m.name}
                    </td>
                    <td className="py-3 text-[10px] text-slate-600">{m.measurement_source.replace(/_/g, ' ')}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isLight ? 'LightVote' : 'PoW Baseline'}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-slate-800">
                      {m.workload_size} txs
                    </td>
                    <td className="py-3 font-mono text-slate-700">
                      {m.avg_latency_ms} ms
                    </td>
                    <td className="py-3 font-mono font-bold text-brand-700">
                      {m.throughput_tps} TPS
                    </td>
                    <td className="py-3 font-mono text-slate-600">
                      {m.measurement_source === 'CHAIN_TRANSACTION' ? m.avg_gas_used.toLocaleString() : 'Not measured'}
                    </td>
                    <td className="py-3 font-mono text-slate-600">
                      {m.measurement_source === 'CHAIN_TRANSACTION' ? `${m.block_confirmation_time_sec} s` : 'Not measured'}
                    </td>
                    <td className="py-3 text-right font-mono text-[11px] text-slate-500">
                      {m.cpu_usage_pct}% • {m.memory_usage_mb}MB
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

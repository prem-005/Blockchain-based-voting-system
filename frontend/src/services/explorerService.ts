import { apiRequest, apiUrl } from './apiClient';

export const explorerService = {
  async getBlocks() {
    return apiRequest<{ connected: boolean; blocks: any[] }>('/explorer/blocks/');
  },

  async getTransactions(params?: { election_id?: string | number; year?: string | number }) {
    const query = new URLSearchParams();
    if (params?.election_id) query.append('election_id', params.election_id.toString());
    if (params?.year) query.append('year', params.year.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    const data = await apiRequest<any>(`/explorer/transactions/${qs}`);
    return (data.results || data || []) as any[];
  },

  async getTransactionDetail(txHash: string) {
    return apiRequest<any>(`/explorer/transactions/${encodeURIComponent(txHash)}/`);
  },
};

export const researchService = {
  async getBenchmarks() {
    const data = await apiRequest<any>('/research/benchmarks/');
    return (data.results || data || []) as any[];
  },

  async runSimulation(workloadSize: number = 50, consensusType: string = 'LIGHTWEIGHT_VALIDATOR') {
    return apiRequest<any>('/research/run-simulation/', {
      method: 'POST',
      body: JSON.stringify({ workload_size: workloadSize, consensus_type: consensusType }),
    });
  },

  getExportCsvUrl() {
    return apiUrl('/research/export-csv/');
  },
};

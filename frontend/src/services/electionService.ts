import { apiRequest } from './apiClient';
import { Election, District, Constituency } from '../types';

export const electionService = {
  async getElections() {
    const data = await apiRequest<any>('/elections/elections/');
    return (data.results || data || []) as Election[];
  },

  async getElection(id: string | number) {
    return apiRequest<Election>(`/elections/elections/${id}/`);
  },

  async createElection(payload: Partial<Election>) {
    return apiRequest<Election>('/elections/elections/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateElectionStatus(id: string | number, status: string) {
    return apiRequest<Election>(`/elections/elections/${id}/status-control/`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  async getDistricts() {
    const data = await apiRequest<any>('/elections/districts/');
    return (data.results || data || []) as District[];
  },

  async getConstituencies(districtId?: string | number) {
    const query = districtId ? `?district_id=${districtId}` : '';
    const data = await apiRequest<any>(`/elections/constituencies/${query}`);
    return (data.results || data || []) as Constituency[];
  },
};

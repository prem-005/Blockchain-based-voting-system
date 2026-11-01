import { apiRequest } from './apiClient';
import { Candidate, Party } from '../types';

export const candidateService = {
  async getCandidates(params?: { election_id?: string | number; constituency_id?: string | number; district_id?: string | number }) {
    const query = new URLSearchParams();
    if (params?.election_id) query.append('election_id', params.election_id.toString());
    if (params?.constituency_id) query.append('constituency_id', params.constituency_id.toString());
    if (params?.district_id) query.append('district_id', params.district_id.toString());
    
    const qs = query.toString() ? `?${query.toString()}` : '';
    const data = await apiRequest<any>(`/candidates/candidates/${qs}`);
    return (data.results || data || []) as Candidate[];
  },

  async createCandidate(payload: FormData | Record<string, any>) {
    const isFormData = payload instanceof FormData;
    return apiRequest<Candidate>('/candidates/candidates/', {
      method: 'POST',
      body: isFormData ? payload : JSON.stringify(payload),
    });
  },

  async getParties() {
    const data = await apiRequest<any>('/candidates/parties/');
    return (data.results || data || []) as Party[];
  },

  async createParty(payload: FormData | Record<string, any>) {
    const isFormData = payload instanceof FormData;
    return apiRequest<Party>('/candidates/parties/', {
      method: 'POST',
      body: isFormData ? payload : JSON.stringify(payload),
    });
  },
};

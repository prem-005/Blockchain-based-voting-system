import { apiRequest } from './apiClient';
import { VoterProfile } from '../types';

export interface VoterRegistrationPayload {
  full_name: string;
  date_of_birth: string;
  email: string;
  mobile_number: string;
  district: number | string;
  constituency: number | string;
  address?: string;
  pin_code?: string;
  password?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  parents_name?: string;
}

export const voterService = {
  async registerVoter(payload: VoterRegistrationPayload) {
    return apiRequest<{
      message: string;
      voter_id: string;
      email: string;
      status: string;
    }>('/voters/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMyProfile() {
    return apiRequest<VoterProfile>('/voters/profile/');
  },

  async getAdminVoterList(params?: { status?: string; district_id?: string | number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.district_id) query.append('district_id', params.district_id.toString());
    if (params?.search) query.append('search', params.search);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const data = await apiRequest<any>(`/voters/admin/list/${qs}`);
    return (data.results || data || []) as any[];
  },

  async reviewVoterApplication(voterId: number | string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) {
    return apiRequest<any>(`/voters/admin/${voterId}/review/`, {
      method: 'POST',
      body: JSON.stringify({ action, rejection_reason: rejectionReason }),
    });
  },
};

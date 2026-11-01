import { apiRequest } from './apiClient';
import { User, VoterProfile } from '../types';

export interface LoginResponse {
  message: string;
  user: User;
  voter_profile?: VoterProfile;
}

export const authService = {
  async sendOTP(email: string, purpose: 'LOGIN' | 'REGISTRATION' | 'BALLOT_ACCESS' = 'LOGIN') {
    return apiRequest<{ message: string; cooldown_seconds: number }>('/auth/send-otp/', {
      method: 'POST',
      body: JSON.stringify({ email, purpose }),
    });
  },

  async verifyOTP(email: string, otp_code: string, purpose: 'LOGIN' | 'REGISTRATION' | 'BALLOT_ACCESS' = 'LOGIN') {
    return apiRequest<LoginResponse>('/auth/verify-otp/', {
      method: 'POST',
      body: JSON.stringify({ email, otp_code, purpose }),
    });
  },

  async login(email: string, password?: string) {
    return apiRequest<LoginResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout() {
    return apiRequest<{ message: string }>('/auth/logout/', {
      method: 'POST',
    });
  },

  async getCurrentUser() {
    return apiRequest<{ user: User; voter_profile?: VoterProfile }>('/auth/me/');
  },
};

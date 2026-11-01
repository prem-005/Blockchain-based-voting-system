import { apiRequest, apiUrl } from './apiClient';

export interface RecordReceiptPayload {
  election: number;
  constituency: number;
  nullifier_hash: string;
  tx_hash: string;
}

export const receiptService = {
  async recordReceipt(payload: RecordReceiptPayload) {
    return apiRequest<any>('/receipts/record/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMyReceipts() {
    return apiRequest<any[]>('/receipts/my-receipts/');
  },

  async verifyReceipt(queryRef: string) {
    return apiRequest<any>(`/receipts/verify/${encodeURIComponent(queryRef)}/`);
  },

  getDownloadPdfUrl(queryRef: string) {
    return apiUrl(`/receipts/download-pdf/${encodeURIComponent(queryRef)}/`);
  },
};

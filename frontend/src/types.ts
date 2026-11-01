export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'CENTRAL_ADMIN' | 'DISTRICT_ADMIN' | 'VOTER';
  assigned_district_id?: number | null;
  is_verified: boolean;
}

export interface VoterProfile {
  voter_id: string;
  voter_id_number?: string;
  full_name?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  district_id: number;
  district_name: string;
  constituency_id: number;
  constituency_name: string;
  wallet_address?: string | null;
}

export interface District {
  id: number;
  name: string;
  code: string;
  state: number;
}

export interface Constituency {
  id: number;
  name: string;
  category: 'GEN' | 'SC' | 'ST';
  district: number;
  district_name?: string;
}

export interface Election {
  id: number;
  name: string;
  year: number;
  scope: string;
  state: number;
  state_name?: string;
  start_time: string;
  end_time: string;
  status: 'UPCOMING' | 'ACTIVE' | 'ENDED' | 'RESULTS_PUBLISHED' | 'ARCHIVED' | 'CANCELLED';
  on_chain_tx_hash?: string;
  created_at: string;
  is_currently_open: boolean;
}

export interface Party {
  id: number;
  name: string;
  abbreviation: string;
  symbol_name: string;
  symbol_image?: string;
  symbol_url?: string;
  color_hex: string;
  is_active: boolean;
}

export interface Candidate {
  id: number;
  candidate_id?: number;
  candidate_ref: string;
  name: string;
  party: number;
  party_details?: Party;
  election: number;
  election_name?: string;
  election_year?: number;
  district: number;
  district_name?: string;
  constituency: number;
  constituency_name?: string;
  photo?: string;
  photo_url?: string;
  affidavit_summary?: string;
  is_active: boolean;
  on_chain_tx_hash?: string;
}

export interface VoteReceipt {
  id: number;
  receipt_ref: string;
  election: number;
  election_name: string;
  election_year: number;
  constituency: number;
  constituency_name: string;
  district_name: string;
  tx_hash: string;
  block_number: number | null;
  block_hash: string;
  nullifier_hash: string;
  merkle_proof: string[];
  gas_used: number;
  status: string;
  chain_status?: string;
  timestamp: string;
}

export interface BenchmarkMetric {
  id: number;
  name: string;
  consensus_type: string;
  consensus_type_display: string;
  workload_size: number;
  batch_size: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  block_confirmation_time_sec: number;
  avg_gas_used: number;
  total_gas_used: number;
  throughput_tps: number;
  verification_time_ms: number;
  cpu_usage_pct: number;
  memory_usage_mb: number;
  storage_kb_per_tx: number;
  network_info: string;
  environment_info: string;
  measurement_source: 'DEVELOPMENT_SEED' | 'LOCAL_SIMULATION' | 'CHAIN_TRANSACTION';
  created_at: string;
}

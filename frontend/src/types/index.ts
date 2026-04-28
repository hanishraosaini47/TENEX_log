// Types mirror the FastAPI Pydantic schemas. Keep them in sync when the API changes.

export interface LoginResponse {
  access_token: string;
  token_type: string;
  username: string;
}

export interface UploadSummary {
  id: number;
  filename: string;
  uploaded_at: string;
  row_count: number;
  analyzed: boolean;
}

export interface UploadCreateResponse {
  upload_id: number;
  filename: string;
  row_count: number;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  username: string | null;
  src_ip: string | null;
  dst: string | null;
  bytes_transferred: number;
  status: number;
  category: string | null;
  action: string | null;
}

export interface UploadStats {
  total_events: number;
  unique_users: number;
  unique_ips: number;
  unique_destinations: number;
  blocked_count: number;
  time_range_start: string | null;
  time_range_end: string | null;
  top_categories: { category: string; count: number }[];
}

export interface UploadDetail {
  upload: UploadSummary;
  stats: UploadStats;
  entries: LogEntry[];
}

export interface TimelineBucket {
  hour: string;
  total_events: number;
  anomaly_count: number;
}

export interface Anomaly {
  id: number;
  log_entry_id: number;
  reason: string;
  confidence: number;
  method: "rule" | "statistical" | "ml";
  detected_at: string;
  log_entry: LogEntry;
}

export interface AnalyzeResponse {
  upload_id: number;
  anomaly_count: number;
  by_method: Record<string, number>;
}

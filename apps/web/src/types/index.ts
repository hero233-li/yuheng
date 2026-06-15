export type JobStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type JobStage =
  | 'submitted'
  | 'executing'
  | 'step_1'
  | 'step_2'
  | 'completed'
  | 'success'
  | 'failed';

export interface Job {
  id: string;
  name: string;
  status: JobStatus;
  stage: JobStage;
  stage_label: string;
  stage_steps: Array<{ key: string; title: string }>;
  stage_index: number;
  progress: number;
  current_step: number;
  total_steps: number;
  payload: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: string | null;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface JobLog {
  id: number;
  level: 'info' | 'warning' | 'error';
  message: string;
  created_at: string;
}

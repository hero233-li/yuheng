import { apiClient } from './client';
import type { Job, JobLog } from '../types';

export async function getHealth() {
  const { data } = await apiClient.get('/health/');
  return data;
}

export async function createJob(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<Job>('/jobs/', payload);
  return data;
}

export async function listJobs() {
  const { data } = await apiClient.get<Job[]>('/jobs/');
  return data;
}

export async function getJob(jobId: string) {
  const { data } = await apiClient.get<Job>(`/jobs/${jobId}/`);
  return data;
}

export async function getJobLogs(jobId: string) {
  const { data } = await apiClient.get<JobLog[]>(`/jobs/${jobId}/logs/`);
  return data;
}

export async function cancelJob(jobId: string) {
  const { data } = await apiClient.post<Job>(`/jobs/${jobId}/cancel/`);
  return data;
}

export interface MultiTaskRowDto {
  id: string;
  product: string;
  owner: string;
  environment: string;
  origin: string;
  region: string;
  city: string;
  applyCount: number;
  patchCount: number;
  approveCount: number;
  priority: '高' | '中' | '低';
  status: '未提交' | '执行中' | '已完成';
  remark: string;
  subTaskCount: number;
}

export interface MultiTaskSubTaskDto {
  id: string;
  title: string;
  assignee: string;
  status: '未开始' | '进行中' | '已完成';
  workload: number;
  dueDate: string;
  remark: string;
}

export interface MultiTaskSubTaskPayload {
  mainTask: MultiTaskRowDto;
  items: MultiTaskSubTaskDto[];
}

export interface MultiTaskTablePayload {
  rows: MultiTaskRowDto[];
  options: Record<string, string[]>;
  summary: {
    applyCount: number;
    patchCount: number;
    approveCount: number;
    completed: number;
  };
}

export async function getMultiTaskTable() {
  const { data } = await apiClient.get<MultiTaskTablePayload>('/mock/multi-task-table/');
  return data;
}

export async function addMultiTaskRow() {
  const { data } = await apiClient.post<MultiTaskTablePayload>('/mock/multi-task-table/rows/');
  return data;
}

export async function updateMultiTaskRow(row: MultiTaskRowDto) {
  const { data } = await apiClient.put<MultiTaskTablePayload>(`/mock/multi-task-table/rows/${row.id}/`, row);
  return data;
}

export async function deleteMultiTaskRow(rowId: string) {
  const { data } = await apiClient.delete<MultiTaskTablePayload>(`/mock/multi-task-table/rows/${rowId}/`);
  return data;
}

export async function saveMultiTaskTable(rows: MultiTaskRowDto[]) {
  const { data } = await apiClient.post<MultiTaskTablePayload>('/mock/multi-task-table/save/', { rows });
  return data;
}

export async function listMultiTaskSubTasks(rowId: string) {
  const { data } = await apiClient.get<MultiTaskSubTaskPayload>(`/mock/multi-task-table/rows/${rowId}/subtasks/`);
  return data;
}

export async function addMultiTaskSubTask(rowId: string) {
  const { data } = await apiClient.post<MultiTaskSubTaskPayload>(`/mock/multi-task-table/rows/${rowId}/subtasks/`);
  return data;
}

export async function updateMultiTaskSubTask(payload: { rowId: string; subTask: MultiTaskSubTaskDto }) {
  const { rowId, subTask } = payload;
  const { data } = await apiClient.put<MultiTaskSubTaskPayload>(
    `/mock/multi-task-table/rows/${rowId}/subtasks/${subTask.id}/`,
    subTask,
  );
  return data;
}

export async function deleteMultiTaskSubTask(payload: { rowId: string; subTaskId: string }) {
  const { rowId, subTaskId } = payload;
  const { data } = await apiClient.delete<MultiTaskSubTaskPayload>(
    `/mock/multi-task-table/rows/${rowId}/subtasks/${subTaskId}/`,
  );
  return data;
}

export interface SearchForm2Option {
  label: string;
  value: string;
}

export interface SearchForm2FieldConfig {
  name: string;
  label: string;
  type: 'input' | 'select' | 'switch';
  required: boolean;
  span: number;
  defaultValue?: string | boolean;
  options?: SearchForm2Option[];
}

export interface SearchForm2EnvironmentConfig extends SearchForm2Option {
  operationIds: string[];
}

export interface SearchForm2OperationConfig extends SearchForm2Option {
  description: string;
  fields: SearchForm2FieldConfig[];
}

export interface SearchForm2Config {
  environments: SearchForm2EnvironmentConfig[];
  operations: SearchForm2OperationConfig[];
}

export interface SearchForm2ResultRow {
  id: string;
  item: string;
  environment: string;
  operation: string;
  status: '成功' | '需复核';
  message: string;
}

export interface SearchForm2Result {
  result_id: string;
  title: string;
  executed_at: string;
  summary: {
    total: number;
    success: number;
    review: number;
  };
  request: {
    environment: string;
    operation: string;
    fields: Record<string, unknown>;
  };
  rows: SearchForm2ResultRow[];
  export_url: string;
}

export async function getSearchForm2Config() {
  const { data } = await apiClient.get<SearchForm2Config>('/mock/search-form-2/config/');
  return data;
}

export async function exportSearchForm2Result(resultId: string) {
  const { data } = await apiClient.get<Blob>(`/mock/search-form-2/results/${resultId}/export/`, {
    responseType: 'blob',
  });
  return data;
}

export interface GroupedCardSearchPayload {
  category: string;
  author?: string;
  rating?: string;
  keyword?: string;
}

export interface GroupedTaskState {
  task_status: 'unclaimed' | 'claimed';
  task_status_label: string;
  current_node: string;
}

export interface GroupedCardItemDto {
  name: string;
  icon: string;
  color: string;
  active: string | number;
  added: number;
  category: string;
  group: 'A组' | 'B组';
  status: 'completed' | 'pending';
  description: string;
}

export async function searchGroupedCards(payload: GroupedCardSearchPayload) {
  const { data } = await apiClient.post('/mock/grouped-cards/', payload);
  return data as { items: GroupedCardItemDto[]; task: GroupedTaskState };
}

export async function getGroupedTaskState() {
  const { data } = await apiClient.get('/mock/grouped-task/state/');
  return data as GroupedTaskState;
}

export async function claimGroupedTask() {
  const { data } = await apiClient.post('/mock/grouped-task/claim/');
  return data as GroupedTaskState;
}

export async function returnGroupedTask() {
  const { data } = await apiClient.post('/mock/grouped-task/return/');
  return data as GroupedTaskState;
}

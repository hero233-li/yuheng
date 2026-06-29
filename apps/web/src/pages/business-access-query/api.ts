import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type {
  ApiResponse,
  BusinessAccessJobDetail,
  BusinessAccessJobStatus,
  BusinessAccessJobSubmission,
  BusinessAccessSearchValues,
  NotificationVersionType,
} from './types';
function createClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
export type PortableRequestConfig = AxiosRequestConfig & {
  showGlobalProgress?: boolean;
  useResponseDelay?: boolean;
};

export interface BusinessAccessApiOptions {
  client?: AxiosInstance;
  basePath?: string;
  pollIntervalMs?: number;
  requestConfig?: PortableRequestConfig;
}

export interface DefaultClientOptions {
  baseURL?: string;
  tokenStorageKey?: string;
  getToken?: () => string | null | undefined;
}

const terminalStatuses = new Set<BusinessAccessJobStatus>([
  'success',
  'failed',
  'cancelled',
  'timed_out',
]);

export function createDefaultBusinessAccessClient(options: DefaultClientOptions = {}) {
  const client = axios.create({ baseURL: options.baseURL ?? '/api', timeout: 15_000 });
  client.interceptors.request.use((config) => {
    const token = options.getToken?.()
      ?? (typeof window === 'undefined'
        ? null
        : window.localStorage.getItem(options.tokenStorageKey ?? 'alioth_token'));
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  return client;
}

function unwrap<T>(response: ApiResponse<T>, fallbackMessage: string) {
  if (!response.ok) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
}

function workflowHeaders() {
  const requestId = createClientId();
  return {
    'X-Idempotency-Key': requestId,
    'X-Trace-ID': requestId.split('-').join(''),
  };
}

function wait(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export function createBusinessAccessApi(options: BusinessAccessApiOptions = {}) {
  const client = options.client ?? createDefaultBusinessAccessClient();
  const basePath = options.basePath ?? '/product-data/business-access';
  const pollIntervalMs = Math.max(200, options.pollIntervalMs ?? 500);

  const requestConfig = (withWorkflowHeaders = false): PortableRequestConfig => ({
    ...options.requestConfig,
    showGlobalProgress: options.requestConfig?.showGlobalProgress ?? false,
    useResponseDelay: options.requestConfig?.useResponseDelay ?? false,
    headers: {
      ...options.requestConfig?.headers,
      ...(withWorkflowHeaders ? workflowHeaders() : {}),
    },
  });

  const submitSearch = async (values: BusinessAccessSearchValues) => {
    const { data } = await client.post<ApiResponse<BusinessAccessJobSubmission>>(
      `${basePath}/search`,
      values,
      requestConfig(true),
    );
    return unwrap(data, '提交业务准入查询失败');
  };

  const submitInvalidate = async (recordId: number) => {
    const { data } = await client.post<ApiResponse<BusinessAccessJobSubmission>>(
      `${basePath}/${recordId}/invalidate`,
      undefined,
      requestConfig(true),
    );
    return unwrap(data, '提交业务准入记录失效失败');
  };

  const submitNotificationQuery = async (recordId: number) => {
    const { data } = await client.post<ApiResponse<BusinessAccessJobSubmission>>(
      `${basePath}/${recordId}/notifications/query`,
      undefined,
      requestConfig(true),
    );
    return unwrap(data, '提交通知记录查询失败');
  };

  const submitNotificationPush = async (
    recordId: number,
    notificationId: number,
    versionType: NotificationVersionType,
  ) => {
    const action = versionType === 'latest' ? 'push-new' : 'push-old';
    const { data } = await client.post<ApiResponse<BusinessAccessJobSubmission>>(
      `${basePath}/${recordId}/notifications/${notificationId}/${action}`,
      undefined,
      requestConfig(true),
    );
    return unwrap(data, '提交通知推送失败');
  };

  const getJob = async (id: number) => {
    const { data } = await client.get<ApiResponse<BusinessAccessJobDetail>>(
      `/jobs/${id}`,
      requestConfig(),
    );
    return unwrap(data, '获取业务准入 Job 进度失败');
  };

  const pollJob = async (
    id: number,
    onProgress: (detail: BusinessAccessJobDetail) => void,
  ) => {
    while (true) {
      const detail = await getJob(id);
      onProgress(detail);
      if (detail.status === 'success') {
        return detail;
      }
      if (terminalStatuses.has(detail.status)) {
        throw new Error(detail.errorMessage || `业务准入 Job 执行失败：${detail.status}`);
      }
      await wait(pollIntervalMs);
    }
  };

  return {
    submitSearch,
    submitInvalidate,
    submitNotificationQuery,
    submitNotificationPush,
    getJob,
    pollJob,
  };
}

export type BusinessAccessApi = ReturnType<typeof createBusinessAccessApi>;

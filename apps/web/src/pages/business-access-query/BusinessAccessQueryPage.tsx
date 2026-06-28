import { Form } from 'antd';
import { useMemo } from 'react';
import type { AxiosInstance } from 'axios';
import {
  createBusinessAccessApi,
  type PortableRequestConfig,
} from './api';
import type { BusinessAccessSearchValues } from './types';
import { useBusinessAccessWorkflow } from './useBusinessAccessWorkflow';
import NotificationModal from './components/NotificationModal';
import ResultsPanel from './components/ResultsPanel';
import SearchPanel from './components/SearchPanel';
import WorkflowProgressModal from './components/WorkflowProgressModal';
import './styles.css';

export interface BusinessAccessQueryPageProps {
  apiClient?: AxiosInstance;
  basePath?: string;
  pollIntervalMs?: number;
  requestConfig?: PortableRequestConfig;
  className?: string;
}

export default function BusinessAccessQueryPage({
  apiClient,
  basePath,
  pollIntervalMs,
  requestConfig,
  className = '',
}: BusinessAccessQueryPageProps) {
  const [form] = Form.useForm<BusinessAccessSearchValues>();
  const api = useMemo(() => createBusinessAccessApi({
    client: apiClient,
    basePath,
    pollIntervalMs,
    requestConfig,
  }), [apiClient, basePath, pollIntervalMs, requestConfig]);
  const businessAccess = useBusinessAccessWorkflow(api);
  const searching = businessAccess.activity?.operation === 'search';

  return (
    <div className={`portable-business-access ${className}`.trim()}>
      <SearchPanel
        form={form}
        busy={businessAccess.busy}
        searching={searching}
        onSearch={(values) => void businessAccess.search(values)}
      />
      <ResultsPanel
        results={businessAccess.results}
        busy={businessAccess.busy}
        searching={searching}
        invalidatingId={businessAccess.invalidatingId}
        onInvalidate={(record) => void businessAccess.invalidate(record)}
        onNotification={(record) => void businessAccess.openNotifications(record)}
      />
      <NotificationModal
        record={businessAccess.selectedRecord}
        notifications={businessAccess.notifications}
        loading={businessAccess.activity?.operation === 'notifications'}
        busy={businessAccess.busy}
        pushingKey={businessAccess.pushingKey}
        onClose={businessAccess.closeNotifications}
        onPush={(notification, versionType) => void businessAccess.pushNotification(notification, versionType)}
      />
      <WorkflowProgressModal activity={businessAccess.activity} />
    </div>
  );
}

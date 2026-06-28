import { Button, Modal, Space, Table, type TableProps } from 'antd';
import { History, Send } from 'lucide-react';
import type {
  BusinessAccessNotification,
  BusinessAccessRecord,
  NotificationVersionType,
} from '../types';

interface NotificationModalProps {
  record: BusinessAccessRecord | null;
  notifications: BusinessAccessNotification[];
  loading: boolean;
  busy: boolean;
  pushingKey: string | null;
  onClose: () => void;
  onPush: (notification: BusinessAccessNotification, versionType: NotificationVersionType) => void;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

export default function NotificationModal({
  record,
  notifications,
  loading,
  busy,
  pushingKey,
  onClose,
  onPush,
}: NotificationModalProps) {
  const columns: NonNullable<TableProps<BusinessAccessNotification>['columns']> = [
    { title: '通知编号', dataIndex: 'notificationNo', width: 150 },
    { title: '通知类型', dataIndex: 'notificationType', width: 150 },
    { title: '目标系统', dataIndex: 'targetSystem', width: 120 },
    { title: '新版本', dataIndex: 'latestVersion', width: 100 },
    { title: '旧版本', dataIndex: 'previousVersion', width: 100 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: formatDate },
    {
      title: '操作',
      key: 'actions',
      width: 190,
      fixed: 'right',
      render: (_, notification) => (
        <Space size={6}>
          <Button
            size="small"
            type="primary"
            icon={<Send size={14} />}
            loading={pushingKey === `${notification.id}:latest`}
            disabled={busy}
            onClick={() => onPush(notification, 'latest')}
          >
            推送新
          </Button>
          <Button
            size="small"
            icon={<History size={14} />}
            loading={pushingKey === `${notification.id}:previous`}
            disabled={busy}
            onClick={() => onPush(notification, 'previous')}
          >
            推送旧
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={record ? `通知推送 - ${record.businessNo}` : '通知推送'}
      width={1080}
      open={Boolean(record)}
      footer={null}
      closable={!busy}
      keyboard={!busy}
      maskClosable={!busy}
      onCancel={onClose}
    >
      <Table<BusinessAccessNotification>
        rowKey="id"
        dataSource={notifications}
        columns={columns}
        loading={loading}
        pagination={false}
        locale={{ emptyText: loading ? 'Workflow 正在加载通知记录...' : '暂无通知记录' }}
        scroll={{ x: 990 }}
        size="small"
      />
    </Modal>
  );
}

import { Button, Card, Popconfirm, Space, Table, Tag, type TableProps } from 'antd';
import { Ban, BellRing } from 'lucide-react';
import type { BusinessAccessRecord } from '../types';

interface ResultsPanelProps {
  results: BusinessAccessRecord[];
  busy: boolean;
  searching: boolean;
  invalidatingId: number | null;
  onInvalidate: (record: BusinessAccessRecord) => void;
  onNotification: (record: BusinessAccessRecord) => void;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

export default function ResultsPanel({
  results,
  busy,
  searching,
  invalidatingId,
  onInvalidate,
  onNotification,
}: ResultsPanelProps) {
  const columns: NonNullable<TableProps<BusinessAccessRecord>['columns']> = [
    { title: '业务编号', dataIndex: 'businessNo', width: 130 },
    { title: '姓名', dataIndex: 'customerName', width: 110 },
    { title: '身份证号', dataIndex: 'certificateNo', width: 190 },
    { title: '产品', dataIndex: 'productName', width: 140 },
    { title: '机构', dataIndex: 'organizationName', width: 170 },
    {
      title: '准入结果',
      dataIndex: 'accessResult',
      width: 110,
      render: (value: BusinessAccessRecord['accessResult']) => (
        <Tag color={value === '通过' ? 'success' : value === '拒绝' ? 'error' : 'warning'}>{value}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: BusinessAccessRecord['status']) => (
        <Tag color={value === 'valid' ? 'blue' : 'default'}>{value === 'valid' ? '有效' : '已失效'}</Tag>
      ),
    },
    { title: '查询时间', dataIndex: 'queriedAt', width: 180, render: formatDate },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Popconfirm
            title="确认将该记录设为失效吗？"
            okText="确认失效"
            cancelText="取消"
            disabled={busy || record.status === 'invalid'}
            onConfirm={() => onInvalidate(record)}
          >
            <Button
              size="small"
              danger
              icon={<Ban size={14} />}
              disabled={busy || record.status === 'invalid'}
              loading={invalidatingId === record.id}
            >
              {record.status === 'invalid' ? '已失效' : '失效'}
            </Button>
          </Popconfirm>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<BellRing size={14} />}
            disabled={busy}
            onClick={() => onNotification(record)}
          >
            通知推送
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="查询结果">
      <Table<BusinessAccessRecord>
        rowKey="id"
        dataSource={results}
        columns={columns}
        locale={{
          emptyText: searching ? 'Workflow 正在查询，完成后展示结果' : '请输入姓名和身份证号进行查询',
        }}
        pagination={{ pageSize: 6, showSizeChanger: false }}
        scroll={{ x: 1350 }}
      />
    </Card>
  );
}

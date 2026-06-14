import { PageContainer, ProCard, ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { Button, Descriptions, Drawer, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { getJobLogs, listJobs } from '../../api/branch';
import { useState } from 'react';
import type { Job, JobLog, JobStatus } from '../../types';

const statusColor: Record<JobStatus, string> = {
  pending: 'default',
  running: 'processing',
  success: 'success',
  failed: 'error',
  cancelled: 'warning',
};

export function JobListPage() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: listJobs,
    refetchInterval: 3000,
  });
  const logsQuery = useQuery<JobLog[]>({
    queryKey: ['job-logs', selectedJob?.id],
    queryFn: () => getJobLogs(selectedJob!.id),
    enabled: Boolean(selectedJob),
    refetchInterval: selectedJob?.status === 'running' || selectedJob?.status === 'pending' ? 1000 : false,
  });

  return (
    <PageContainer
      title="任务记录"
      extra={<Button onClick={() => refetch()}>刷新</Button>}
    >
      <ProCard>
        <ProTable<Job>
          rowKey="id"
          search={false}
          options={false}
          loading={isLoading}
          dataSource={data}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '任务编号', dataIndex: 'id', width: 230, ellipsis: true },
            { title: '名称', dataIndex: 'name' },
            {
              title: '状态',
              dataIndex: 'status',
              width: 120,
              render: (_, record) => <Tag color={statusColor[record.status]}>{record.status}</Tag>,
            },
            {
              title: '创建时间',
              dataIndex: 'created_at',
              width: 180,
              render: (_, record) => dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss'),
            },
            {
              title: '操作',
              width: 160,
              render: (_, record) => (
                <Space>
                  <Button size="small" onClick={() => setSelectedJob(record)}>
                    详情
                  </Button>
                  <Button size="small" danger disabled={record.status !== 'pending'}>
                    取消
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </ProCard>
      <Drawer
        title="任务详情"
        width={720}
        open={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
      >
        {selectedJob && (
          <div className="page-stack">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="任务编号">{selectedJob.id}</Descriptions.Item>
              <Descriptions.Item label="任务名称">{selectedJob.name}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColor[selectedJob.status]}>{selectedJob.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="结果">
                <Typography.Text code>
                  {selectedJob.result ? JSON.stringify(selectedJob.result, null, 2) : '暂无结果'}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="错误">
                {selectedJob.error || '-'}
              </Descriptions.Item>
            </Descriptions>
            <ProCard title="执行日志" loading={logsQuery.isLoading}>
              <div className="log-box">
                {(logsQuery.data || []).map((log) => (
                  <div key={log.id}>
                    [{dayjs(log.created_at).format('HH:mm:ss')}] [{log.level}] {log.message}
                  </div>
                ))}
                {!logsQuery.data?.length && <div>暂无日志</div>}
              </div>
            </ProCard>
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
}

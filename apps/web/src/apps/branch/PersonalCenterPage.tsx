import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Descriptions, List, Progress, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { listJobs } from '../../api/branch';
import { useAuthStore } from '../../stores/authStore';

export function PersonalCenterPage() {
  const { username, branchName } = useAuthStore();
  const jobsQuery = useQuery({ queryKey: ['jobs'], queryFn: listJobs, refetchInterval: 3000 });

  return (
    <PageContainer title="个人中心" subTitle="汇总当前用户执行过的搜索和结果">
      <div className="page-stack">
        <ProCard>
          <Space size={16}>
            <Avatar size={64}>{branchName?.slice(0, 1).toUpperCase() || 'F'}</Avatar>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>{branchName || 'fj001'}</Typography.Title>
              <Typography.Text type="secondary">登录用户：{username || 'user'}</Typography.Text>
            </div>
          </Space>
        </ProCard>

        <ProCard title="执行历史">
          <List
            loading={jobsQuery.isLoading}
            dataSource={jobsQuery.data || []}
            renderItem={(job) => (
              <List.Item
                actions={[
                  <Button size="small" key="view">查看结果</Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar>{job.name.slice(0, 1)}</Avatar>}
                  title={
                    <Space>
                      <Typography.Text strong>{job.name}</Typography.Text>
                      <Tag color={job.status === 'success' ? 'success' : job.status === 'failed' ? 'error' : 'processing'}>
                        {job.stage_label}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Descriptions size="small" column={3}>
                        <Descriptions.Item label="记录编号">{job.id}</Descriptions.Item>
                        <Descriptions.Item label="创建时间">{dayjs(job.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                        <Descriptions.Item label="结果">{getJobSummary(job.result, job.error)}</Descriptions.Item>
                      </Descriptions>
                      <Progress percent={job.progress} size="small" />
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </ProCard>
      </div>
    </PageContainer>
  );
}

function getJobSummary(result: Record<string, unknown> | null | undefined, error?: string | null) {
  if (typeof result?.summary === 'string') {
    return result.summary;
  }
  return error || '暂无结果';
}

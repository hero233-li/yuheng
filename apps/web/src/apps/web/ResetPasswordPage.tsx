import { PlayCircleOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useMutation, useQuery } from '@tanstack/react-query';
import { App, Button, Col, Form, Input, Progress, Row, Select, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { createJob, getJob } from '../../api/app';

const environmentOptions = [
  { label: '环境1', value: 'env_1' },
  { label: '环境2', value: 'env_2' },
  { label: '环境3', value: 'env_3' },
];

export function ResetPasswordPage() {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [jobId, setJobId] = useState<string | null>(null);

  const jobQuery = useQuery({
    queryKey: ['reset-password-job', jobId],
    queryFn: () => getJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const job = query.state.data;
      return job && ['success', 'failed', 'cancelled'].includes(job.status) ? false : 1000;
    },
  });

  const executeMutation = useMutation({
    mutationFn: createJob,
    onSuccess: (job) => {
      setJobId(job.id);
      message.success('重置密码任务已提交');
    },
  });

  function handleExecute(values: { environment: string; username: string }) {
    const environment = environmentOptions.find((item) => item.value === values.environment);
    const bizPayload = {
      environment: values.environment,
      environmentLabel: environment?.label || values.environment,
      username: values.username,
    };
    executeMutation.mutate({
      name: `重置密码-${environment?.label || values.environment}-${values.username}`,
      workflow: 'reset_password',
      search_form: bizPayload,
      biz_payload: JSON.stringify(bizPayload, null, 2),
    });
  }

  return (
    <PageContainer title="重置密码" subTitle="选择环境并输入用户名，执行后展示后端返回进度">
      <div className="page-stack">
        <ProCard title="执行条件">
          <Form
            form={form}
            layout="vertical"
            initialValues={{ environment: environmentOptions[0].value }}
            onFinish={handleExecute}
          >
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="环境" name="environment" rules={[{ required: true, message: '请选择环境' }]}>
                  <Select options={environmentOptions} onChange={() => setJobId(null)} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="用户名"
                  name="username"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input placeholder="请输入用户名" onChange={() => setJobId(null)} />
                </Form.Item>
              </Col>
            </Row>

            <Space>
              <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />} loading={executeMutation.isPending}>
                执行
              </Button>
              <Button
                onClick={() => {
                  form.resetFields();
                  setJobId(null);
                }}
              >
                重置
              </Button>
            </Space>
          </Form>
        </ProCard>

        {jobQuery.data && (
          <ProCard title="执行状态">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={jobQuery.data.status === 'success' ? 'success' : jobQuery.data.status === 'failed' ? 'error' : 'processing'}>
                  {jobQuery.data.stage_label}
                </Tag>
              </Space>
              <Progress
                percent={jobQuery.data.progress}
                status={jobQuery.data.status === 'failed' ? 'exception' : jobQuery.data.status === 'success' ? 'success' : 'active'}
              />
              {typeof jobQuery.data.result?.summary === 'string' && (
                <Typography.Text>{jobQuery.data.result.summary}</Typography.Text>
              )}
              {jobQuery.data.error && <Typography.Text type="danger">{jobQuery.data.error}</Typography.Text>}
            </Space>
          </ProCard>
        )}
      </div>
    </PageContainer>
  );
}

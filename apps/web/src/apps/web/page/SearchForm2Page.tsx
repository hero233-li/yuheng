import { PlayCircleOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useMutation, useQuery } from '@tanstack/react-query';
import { App, Button, Col, Form, Input, Progress, Row, Select, Space, Switch, Tag, Typography } from 'antd';
import { useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  createJob,
  getJob,
  getSearchForm2Config,
  type SearchForm2FieldConfig,
} from '../../../api/app';

export function SearchForm2Page() {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const location = useLocation();
const [searchParams] = useSearchParams();

const currentPageKey = searchParams.get('tabKey') || location.pathname;

const formCacheKey = `search-form-2-form:${currentPageKey}`;
const jobIdCacheKey = `search-form-2-job-id:${currentPageKey}`;

  const configQuery = useQuery({ queryKey: ['mock-search-form-2-config'], queryFn: getSearchForm2Config });
  const [jobId, setJobId] = useState<string | null>(() => {
  return sessionStorage.getItem(jobIdCacheKey);
});
  useLayoutEffect(() => {
  setJobId(sessionStorage.getItem(jobIdCacheKey));
}, [currentPageKey, jobIdCacheKey]);
  const watchedEnvironment = Form.useWatch('environment', form);
  const watchedOperation = Form.useWatch('operation', form);
  useLayoutEffect(() => {
  const config = configQuery.data;

  if (!config) {
    return;
  }

  const cached = sessionStorage.getItem(formCacheKey);

  if (cached) {
    try {
      form.setFieldsValue(JSON.parse(cached));
      return;
    } catch {
      sessionStorage.removeItem(formCacheKey);
    }
  }

  const defaultEnvironment = config.environments[0];
  const defaultOperation = config.operations.find((item) =>
    defaultEnvironment.operationIds.includes(item.value),
  );

  form.setFieldsValue({
    environment: defaultEnvironment?.value,
    operation: defaultOperation?.value,
    ...getFieldDefaultValues(defaultOperation?.fields || []),
  });
}, [configQuery.data, currentPageKey, form, formCacheKey]);

  const supportedOperations = useMemo(() => {
    const config = configQuery.data;
    if (!config) {
      return [];
    }
    const environment = config.environments.find((item) => item.value === watchedEnvironment) || config.environments[0];
    return config.operations.filter((operation) => environment?.operationIds.includes(operation.value));
  }, [configQuery.data, watchedEnvironment]);

  const activeOperation = useMemo(() => {
    return supportedOperations.find((item) => item.value === watchedOperation) || supportedOperations[0];
  }, [supportedOperations, watchedOperation]);

  const jobQuery = useQuery({
    queryKey: ['search-form-2-job', jobId],
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
  sessionStorage.setItem(jobIdCacheKey, job.id);
  message.success(`执行任务已提交：${job.id}`);
},
  });
  const isJobFinished =
  jobQuery.data &&
  ['success', 'failed', 'cancelled'].includes(jobQuery.data.status);

const isExecuting =
  executeMutation.isPending ||
  Boolean(jobId && !isJobFinished);





  function handleEnvironmentChange(environment: string) {
  const config = configQuery.data;
  const nextEnvironment = config?.environments.find((item) => item.value === environment);
  const nextOperation = config?.operations.find((item) => nextEnvironment?.operationIds.includes(item.value));

  form.setFieldsValue({
    operation: nextOperation?.value,
    ...getFieldDefaultValues(nextOperation?.fields || []),
  });

  setJobId(null);
  sessionStorage.removeItem(jobIdCacheKey);
  saveFormCache();
}

  function handleOperationChange(operation: string) {
  const nextOperation = configQuery.data?.operations.find((item) => item.value === operation);

  form.setFieldsValue(getFieldDefaultValues(nextOperation?.fields || []));

  setJobId(null);
  sessionStorage.removeItem(jobIdCacheKey);
  saveFormCache();
}
function saveFormCache() {
  setTimeout(() => {
    sessionStorage.setItem(formCacheKey, JSON.stringify(form.getFieldsValue(true)));
  }, 0);
}
  function handleExecute(values: Record<string, unknown>) {
    const fieldNames = new Set((activeOperation?.fields || []).map((field) => field.name));
    const fields = Object.fromEntries(Object.entries(values).filter(([key]) => fieldNames.has(key)));
    const environment = configQuery.data?.environments.find((item) => item.value === values.environment);
    const operation = configQuery.data?.operations.find((item) => item.value === values.operation);
    const bizPayload = {
      environment: String(values.environment || ''),
      environmentLabel: environment?.label || values.environment,
      operation: String(values.operation || ''),
      operationLabel: operation?.label || values.operation,
      fields,
    };
    executeMutation.mutate({
      name: `数据维护-${environment?.label || values.environment}-${operation?.label || values.operation}`,
      workflow: 'search_form_2',
      search_form: bizPayload,
      biz_payload: JSON.stringify(bizPayload, null, 2),
    });
  }

  return (
    <PageContainer title={false}>
      <div className="page-stack">
        <ProCard title="执行条件" loading={configQuery.isLoading}>
          <Form
  key={currentPageKey}
  form={form}
  layout="vertical"
  onValuesChange={saveFormCache}
  onFinish={handleExecute}
>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="环境" name="environment" rules={[{ required: true, message: '请选择环境' }]}>
                  <Select
                    options={configQuery.data?.environments.map(({ label, value }) => ({ label, value })) || []}
                    onChange={handleEnvironmentChange}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="操作" name="operation" rules={[{ required: true, message: '请选择操作' }]}>
                  <Select
                    options={supportedOperations.map(({ label, value }) => ({ label, value }))}
                    onChange={handleOperationChange}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <div className="form2-operation-note">
                  <Typography.Text type="secondary">
                    {activeOperation?.description || '选择环境后，后端配置会限定可执行的操作。'}
                  </Typography.Text>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              {(activeOperation?.fields || []).map((field) => (
                <Col span={field.span} key={field.name}>
                  <Form.Item
                    label={field.label}
                    name={field.name}
                    valuePropName={field.type === 'switch' ? 'checked' : 'value'}
                    rules={field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined}
                  >
                    {renderField(field)}
                  </Form.Item>
                </Col>
              ))}
            </Row>

            <Space>
              <Button
  type="primary"
  htmlType="submit"
  icon={<PlayCircleOutlined />}
  loading={isExecuting}
  disabled={isExecuting}
>
  {isExecuting ? '执行中' : '执行'}
</Button>
              <Button
  onClick={() => {
    form.resetFields();
    setJobId(null);
    sessionStorage.removeItem(formCacheKey);
    sessionStorage.removeItem(jobIdCacheKey);
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
              {jobQuery.data.error && <Typography.Text type="danger">{jobQuery.data.error}</Typography.Text>}
            </Space>
          </ProCard>
        )}
      </div>
    </PageContainer>
  );
}

function renderField(field: SearchForm2FieldConfig) {
  if (field.type === 'select') {
    return <Select options={field.options || []} />;
  }
  if (field.type === 'switch') {
    return <Switch />;
  }
  return <Input placeholder={`请输入${field.label}`} />;
}

function getFieldDefaultValues(fields: SearchForm2FieldConfig[]) {
  return Object.fromEntries(
    fields
      .filter((field) => field.defaultValue !== undefined)
      .map((field) => [field.name, field.defaultValue]),
  );
}

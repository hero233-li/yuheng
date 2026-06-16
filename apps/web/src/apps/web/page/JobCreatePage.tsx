import { PageContainer, ProCard, ProTable } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Col,
  Drawer,
  Form,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Steps,
  Switch,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { createJob, getJob, getJobLogs, listJobs } from '../../../api/app';
import type { Job, JobLog, JobStage, JobStatus } from '../../../types';
import {
  buildSearchConfig,
  cascadeResetMap,
  getInitialSearchValues,
  searchPageBehavior,
  type FieldConfig,
} from '../config/searchFormConfig';

const statusColor: Record<JobStatus, string> = {
  pending: 'default',
  running: 'processing',
  success: 'success',
  failed: 'error',
  cancelled: 'warning',
};

const stageColor: Record<JobStage, string> = {
  submitted: 'default',
  executing: 'processing',
  step_1: 'blue',
  step_2: 'cyan',
  completed: 'purple',
  success: 'success',
  failed: 'error',
};

export function JobCreatePage() {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [submittedJobIds, setSubmittedJobIds] = useState<string[]>([]);
  const watchedValues = Form.useWatch([], form) || {};
  const searchConfig = useMemo(() => buildSearchConfig(watchedValues), [watchedValues]);

  const initialValues = useMemo(
    () => getInitialSearchValues(),
    [],
  );

  const jobsQuery = useQuery({
    queryKey: ['jobs'],
    queryFn: listJobs,
    enabled: searchPageBehavior.readHistoryOnOpen || submittedJobIds.length > 0,
    refetchInterval: 1000,
  });

  const selectedJobQuery = useQuery<Job>({
    queryKey: ['job', selectedJobId],
    queryFn: () => getJob(selectedJobId!),
    enabled: Boolean(selectedJobId),
    refetchInterval: selectedJobId ? 1000 : false,
  });

  const logsQuery = useQuery<JobLog[]>({
    queryKey: ['job-logs', selectedJobId],
    queryFn: () => getJobLogs(selectedJobId!),
    enabled: Boolean(selectedJobId),
    refetchInterval: selectedJobId ? 1000 : false,
  });

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: async (job) => {
      setSubmittedJobIds((current) => [job.id, ...current]);
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setSelectedJobId(job.id);
      message.success('执行任务已提交');
    },
  });

  const selectedJob = selectedJobQuery.data;

  function isFieldVisible(field: FieldConfig) {
    if (!field.visible) {
      return false;
    }
    if (!field.visibleWhen) {
      return true;
    }
    return watchedValues[field.visibleWhen.field] === field.visibleWhen.value;
  }

  function getFieldOptions(field: FieldConfig) {
    return getFieldOptionsWithValues(field, watchedValues);
  }

  function getFieldOptionsWithValues(field: FieldConfig, values: Record<string, unknown>) {
    const dynamicConfig = buildSearchConfig(values);
    const dynamicField = dynamicConfig.find((item) => item.name === field.name);
    return dynamicField?.options || field.options || [];
  }

  function normalizeCascadeValues(changedValues: Record<string, unknown>) {
    const changedName = Object.keys(changedValues)[0];
    if (changedName === 'companyName' && !String(changedValues.companyName || '').trim()) {
      form.setFieldsValue({ legalPerson: false });
      return;
    }
    const resetFields = cascadeResetMap[changedName];
    if (!resetFields) {
      return;
    }

    const currentValues = { ...form.getFieldsValue(), ...changedValues };
    const nextValues: Record<string, unknown> = {};
    for (const fieldName of resetFields) {
      const fieldConfig = buildSearchConfig({ ...currentValues, ...nextValues }).find(
        (field) => field.name === fieldName,
      );
      if (!fieldConfig) {
        continue;
      }
      const options = getFieldOptionsWithValues(fieldConfig, { ...currentValues, ...nextValues });
      nextValues[fieldName] = fieldConfig.multiple
        ? options[0]?.value
          ? [options[0].value]
          : []
        : options[0]?.value;
    }
    form.setFieldsValue(nextValues);
  }

  function renderField(field: FieldConfig) {
    const commonProps = {
      disabled: !field.editable,
      placeholder: field.placeholder,
    };

    if (field.type === 'select') {
      return (
        <Select
          {...commonProps}
          mode={field.multiple ? 'multiple' : undefined}
          options={getFieldOptions(field)}
          allowClear
          showSearch={field.searchable}
          optionFilterProp="label"
          filterOption={(input, option) => {
            const keyword = input.trim().toLowerCase();
            const label = String(option?.label ?? '').toLowerCase();
            const value = String(option?.value ?? '').toLowerCase();
            return label.includes(keyword) || value.includes(keyword);
          }}
        />
      );
    }
    if (field.type === 'switch') {
      const hasSwitchLabel = Boolean(field.checkedLabel || field.uncheckedLabel);
      return (
        <Switch
          className={hasSwitchLabel ? 'form-switch-with-label' : undefined}
          disabled={!field.editable}
          size="default"
          checkedChildren={field.checkedLabel}
          unCheckedChildren={field.uncheckedLabel}
          style={field.switchWidth ? { minWidth: field.switchWidth, width: field.switchWidth } : undefined}
        />
      );
    }
    return <Input {...commonProps} />;
  }

  const resultJobs = useMemo(() => {
    const jobs = jobsQuery.data || [];
    if (searchPageBehavior.readHistoryOnOpen) {
      return jobs;
    }
    const idSet = new Set(submittedJobIds);
    return jobs.filter((job) => idSet.has(job.id));
  }, [jobsQuery.data, submittedJobIds]);

  function buildSubmitPayload(values: Record<string, unknown>) {
    const submittedFields = searchConfig
      .filter((field) => field.submit && isFieldVisible(field))
      .reduce<Record<string, unknown>>((payload, field) => {
        payload[field.name] = values[field.name];
        return payload;
      }, {});

    return {
      name: String(values.name || '产品申请'),
      workflow: 'product_apply',
      search_form: submittedFields,
      biz_payload: JSON.stringify(submittedFields, null, 2),
    };
  }

  return (
    <PageContainer title={false}>
      <div className="page-stack">
        <ProCard title="申请条件">
          <Form
            form={form}
            layout="vertical"
            initialValues={initialValues}
            onValuesChange={normalizeCascadeValues}
            onFinish={(values) => mutation.mutate(buildSubmitPayload(values))}
          >
            <Row gutter={16}>
              {searchConfig.filter(isFieldVisible).map((field) => (
                <Col span={field.span} key={field.name}>
                  <Form.Item
                    name={field.name}
                    label={field.label}
                    rules={field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined}
                    valuePropName={field.type === 'switch' ? 'checked' : 'value'}
                  >
                    {renderField(field)}
                  </Form.Item>
                </Col>
              ))}
            </Row>
            <Space className="form-action-center">
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                执行
              </Button>
              <Button onClick={() => form.resetFields()}>重置</Button>
            </Space>
          </Form>
        </ProCard>

        <ProCard title="执行结果">
          <ProTable<Job>
            rowKey="id"
            search={false}
            options={false}
            loading={jobsQuery.isLoading}
            dataSource={resultJobs}
            pagination={{ pageSize: 6 }}
            columns={[
              { title: '申请项目', dataIndex: 'name', width: 180 },
              {
                title: '状态',
                dataIndex: 'stage_label',
                width: 140,
                render: (_, record) => (
                  <Tag color={stageColor[record.stage]}>{record.stage_label}</Tag>
                ),
              },
              {
                title: '进度',
                dataIndex: 'progress',
                width: 220,
                render: (_, record) => (
                  <Progress
                    percent={record.progress}
                    size="small"
                    status={record.status === 'failed' ? 'exception' : record.status === 'success' ? 'success' : 'active'}
                  />
                ),
              },
              {
                title: '创建时间',
                dataIndex: 'created_at',
                width: 180,
                render: (_, record) => dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss'),
              },
              {
                title: '操作',
                width: 100,
                render: (_, record) => (
                  <Button size="small" onClick={() => setSelectedJobId(record.id)}>
                    详情
                  </Button>
                ),
              },
            ]}
          />
        </ProCard>
      </div>

      <Drawer
        title="执行详情"
        width={780}
        open={Boolean(selectedJobId)}
        onClose={() => setSelectedJobId(null)}
      >
        {selectedJob && (
          <div className="page-stack">
            <div className="job-detail-summary">
              <div className="job-detail-item">
                <Typography.Text type="secondary">申请项目</Typography.Text>
                <Typography.Text strong>{selectedJob.name}</Typography.Text>
              </div>
              <div className="job-detail-item">
                <Typography.Text type="secondary">执行状态</Typography.Text>
                <Space wrap>
                  <Tag color={statusColor[selectedJob.status]}>{selectedJob.status}</Tag>
                  <Tag color={stageColor[selectedJob.stage]}>{selectedJob.stage_label}</Tag>
                </Space>
              </div>
              <div className="job-detail-item job-detail-item-full">
                <Typography.Text type="secondary">提交参数</Typography.Text>
                <pre className="job-detail-code">
                  {JSON.stringify(selectedJob.payload.search_form || selectedJob.payload, null, 2)}
                </pre>
              </div>
            </div>

            <ProCard title="执行进度">
              <Progress
                percent={selectedJob.progress}
                status={selectedJob.status === 'failed' ? 'exception' : selectedJob.status === 'success' ? 'success' : 'active'}
              />
              <div className="job-steps-wrap">
                <Steps
                  current={selectedJob.stage_index}
                  status={selectedJob.status === 'failed' ? 'error' : selectedJob.status === 'success' ? 'finish' : 'process'}
                  items={selectedJob.stage_steps.map((step) => ({ title: step.title }))}
                />
              </div>
            </ProCard>

            <ProCard title="执行记录" loading={logsQuery.isLoading}>
              <div className="log-box">
                {(logsQuery.data || []).map((log) => (
                  <div key={log.id}>
                    [{dayjs(log.created_at).format('HH:mm:ss')}] [{log.level}] {log.message}
                  </div>
                ))}
                {!logsQuery.data?.length && <div>暂无执行记录</div>}
              </div>
            </ProCard>

            <ProCard title="Mock 返回数据">
              <Typography.Text code>
                {selectedJob.result ? JSON.stringify(selectedJob.result, null, 2) : '暂无结果'}
              </Typography.Text>
            </ProCard>
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
}

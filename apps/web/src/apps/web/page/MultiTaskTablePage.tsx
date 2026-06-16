import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { PageContainer, ProCard, ProTable } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Descriptions, Drawer, Input, InputNumber, Popconfirm, Select, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import {
  addMultiTaskRow,
  addMultiTaskSubTask,
  deleteMultiTaskRow,
  deleteMultiTaskSubTask,
  getMultiTaskTable,
  listMultiTaskSubTasks,
  updateMultiTaskRow,
  updateMultiTaskSubTask,
  type MultiTaskRowDto,
  type MultiTaskSubTaskDto,
  type MultiTaskSubTaskPayload,
  type MultiTaskTablePayload,
} from '../../../api/app';
import { useAppPreferences } from '../../../stores/appPreferences';

const { TextArea } = Input;
const MAIN_TASK_STATUS_OPTIONS: MultiTaskRowDto['status'][] = ['未提交', '执行中', '已完成', '存档'];

export function MultiTaskTablePage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const tableSize = useAppPreferences((state) => state.tableSize);
  const tableQuery = useQuery({ queryKey: ['mock-multi-task-table'], queryFn: getMultiTaskTable });
  const [draftRows, setDraftRows] = useState<MultiTaskRowDto[]>([]);
  const [activeMainTaskId, setActiveMainTaskId] = useState<string | null>(null);
  const [remarkEditing, setRemarkEditing] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState('');

  const applyServerPayload = (data: MultiTaskTablePayload) => {
    queryClient.setQueryData(['mock-multi-task-table'], data);
    setDraftRows(data.rows);
  };

  const addMutation = useMutation({
    mutationFn: addMultiTaskRow,
    onSuccess: (data) => {
      applyServerPayload(data);
      message.success('后端 mock 已新增一行');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateMultiTaskRow,
    onSuccess: applyServerPayload,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMultiTaskRow,
    onSuccess: (data) => {
      applyServerPayload(data);
      message.success('后端 mock 已删除该行');
    },
  });

  const subTaskQuery = useQuery({
    queryKey: ['mock-multi-task-subtasks', activeMainTaskId],
    queryFn: () => listMultiTaskSubTasks(activeMainTaskId!),
    enabled: Boolean(activeMainTaskId),
  });

  const applySubTaskPayload = (data: MultiTaskSubTaskPayload) => {
    queryClient.setQueryData(['mock-multi-task-subtasks', data.mainTask.id], data);
    queryClient.invalidateQueries({ queryKey: ['mock-multi-task-table'] });
  };

  const addSubTaskMutation = useMutation({
    mutationFn: addMultiTaskSubTask,
    onSuccess: (data) => {
      applySubTaskPayload(data);
      message.success('已新增子任务');
    },
  });

  const updateSubTaskMutation = useMutation({
    mutationFn: updateMultiTaskSubTask,
    onSuccess: applySubTaskPayload,
  });

  const deleteSubTaskMutation = useMutation({
    mutationFn: deleteMultiTaskSubTask,
    onSuccess: (data) => {
      applySubTaskPayload(data);
      message.success('已删除子任务');
    },
  });

  useEffect(() => {
    if (tableQuery.data) {
      setDraftRows(tableQuery.data.rows);
    }
  }, [tableQuery.data]);

  useEffect(() => {
    const activeRow = draftRows.find((row) => row.id === activeMainTaskId);
    setRemarkDraft(activeRow?.remark || '');
    setRemarkEditing(false);
  }, [activeMainTaskId, draftRows]);

  const rows = draftRows;
  const activeMainTask = rows.find((row) => row.id === activeMainTaskId);
  const activeMainTaskArchived = activeMainTask?.status === '存档';
  const selectOptions = useMemo(
    () => ({
      product: tableQuery.data?.options.product || [],
      environment: tableQuery.data?.options.environment || [],
      origin: tableQuery.data?.options.origin || [],
      region: tableQuery.data?.options.region || [],
      city: tableQuery.data?.options.city || [],
      priority: tableQuery.data?.options.priority || [],
      status: mergeOptions(tableQuery.data?.options.status || [], MAIN_TASK_STATUS_OPTIONS),
      taskCategory: tableQuery.data?.options.taskCategory || [],
    }),
    [tableQuery.data],
  );

  function patchDraftRow<K extends keyof MultiTaskRowDto>(id: string, key: K, value: MultiTaskRowDto[K]) {
    setDraftRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function getDraftRow(id: string) {
    return draftRows.find((row) => row.id === id);
  }

  function persistDraftRow(id: string) {
    const row = getDraftRow(id);
    if (row) {
      updateMutation.mutate(row);
    }
  }

  function updateAndPersist<K extends keyof MultiTaskRowDto>(id: string, key: K, value: MultiTaskRowDto[K]) {
    const nextRows = draftRows.map((row) => (row.id === id ? { ...row, [key]: value } : row));
    setDraftRows(nextRows);
    const nextRow = nextRows.find((row) => row.id === id);
    if (nextRow) {
      updateMutation.mutate(nextRow);
    }
  }

  function saveMainTaskRemark() {
    if (!activeMainTask) {
      return;
    }
    if (remarkDraft === activeMainTask.remark) {
      setRemarkEditing(false);
      return;
    }
    updateAndPersist(activeMainTask.id, 'remark', remarkDraft);
    setRemarkEditing(false);
  }

  return (
    <PageContainer title={false}>
      <div className="page-stack">
        <ProCard
          title="主任务列表"
          extra={
            <Space>
              <Button icon={<PlusOutlined />} loading={addMutation.isPending} onClick={() => addMutation.mutate()}>
                新增主任务
              </Button>
            </Space>
          }
        >
          <ProTable<MultiTaskRowDto>
            rowKey="id"
            search={false}
            options={false}
            size={tableSize}
            loading={tableQuery.isLoading || updateMutation.isPending}
            dataSource={rows}
            columns={[
              {
                title: '任务名称',
                dataIndex: 'taskName',
                fixed: 'left',
                width: 320,
                render: (_, row) => (
                  <Input
                    value={row.taskName}
                    placeholder="填写任务名称"
                    disabled={isArchivedRow(row)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => patchDraftRow(row.id, 'taskName', event.target.value)}
                    onBlur={() => persistDraftRow(row.id)}
                  />
                ),
              },
              {
                title: '任务类别',
                dataIndex: 'taskCategory',
                width: 160,
                filters: buildColumnFilters(selectOptions.taskCategory),
                onFilter: (value, row) => row.taskCategory === value,
                render: (_, row) => renderSelect(row, 'taskCategory', selectOptions.taskCategory, updateAndPersist, isArchivedRow(row)),
              },
              {
                title: '任务状态',
                dataIndex: 'status',
                width: 160,
                filters: buildColumnFilters(selectOptions.status),
                onFilter: (value, row) => row.status === value,
                render: (_, row) => renderStatus(row, selectOptions.status, updateAndPersist),
              },
              {
                title: '任务截止日期',
                dataIndex: 'dueDate',
                width: 170,
                render: (_, row) => (
                  <DatePicker
                    value={row.dueDate ? dayjs(row.dueDate) : null}
                    format="YYYY-MM-DD"
                    allowClear={false}
                    disabled={isArchivedRow(row)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(value) => updateAndPersist(row.id, 'dueDate', value ? value.format('YYYY-MM-DD') : '')}
                    style={{ width: '100%' }}
                  />
                ),
              },
              {
                title: '任务完成度',
                dataIndex: 'completion',
                width: 110,
                render: (_, row) => (
                  <InputNumber
                    min={0}
                    max={100}
                    value={row.completion}
                    formatter={(value) => `${value}%`}
                    parser={(value) => Number(value?.replace('%', '') || 0)}
                    disabled={isArchivedRow(row)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(value) => updateAndPersist(row.id, 'completion', Number(value || 0))}
                    style={{ width: '100%' }}
                  />
                ),
              },
              {
                title: '操作',
                fixed: 'right',
                width: 180,
                render: (_, row) => (
                  <Space>
                    <Button size="small" onClick={() => setActiveMainTaskId(row.id)}>
                      {isArchivedRow(row) ? '查看子任务' : '编辑子任务'}
                    </Button>
                    <Popconfirm title="确认删除这个主任务？" onConfirm={() => deleteMutation.mutate(row.id)}>
                      <Button danger size="small" disabled={isArchivedRow(row)} loading={deleteMutation.isPending}>删除</Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
            rowClassName={(row) => `multi-task-row multi-task-row-${getStatusClassName(row.status)}`}
            onRow={(row) => ({
              onClick: () => setActiveMainTaskId(row.id),
            })}
            scroll={{ x: 1100 }}
            pagination={{ pageSize: 20, showSizeChanger: true }}
          />
        </ProCard>

        <Drawer
          title="主任务子任务"
          width={980}
          open={Boolean(activeMainTaskId)}
          onClose={() => setActiveMainTaskId(null)}
          destroyOnClose
        >
          <div className="page-stack">
            {activeMainTask && (
              <>
                <div className="main-task-remark">
                  <div className="main-task-remark-header">
                    <Typography.Text strong>主任务备注</Typography.Text>
                    {!remarkEditing && !activeMainTaskArchived && (
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => setRemarkEditing(true)}
                      />
                    )}
                  </div>
                  {remarkEditing ? (
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <TextArea
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        value={remarkDraft}
                        placeholder="填写主任务备注"
                        disabled={activeMainTaskArchived}
                        onChange={(event) => setRemarkDraft(event.target.value)}
                        onBlur={saveMainTaskRemark}
                      />
                      <Space>
                        <Button
                          size="small"
                          onClick={() => {
                            setRemarkDraft(activeMainTask.remark || '');
                            setRemarkEditing(false);
                          }}
                        >
                          取消
                        </Button>
                      </Space>
                    </Space>
                  ) : (
                    <Typography.Paragraph className="main-task-remark-text">
                      {activeMainTask.remark || '暂无备注'}
                    </Typography.Paragraph>
                  )}
                </div>

                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="任务名称">{activeMainTask.taskName}</Descriptions.Item>
                  <Descriptions.Item label="任务类别">{activeMainTask.taskCategory}</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag color={activeMainTask.status === '已完成' ? 'success' : activeMainTask.status === '执行中' ? 'processing' : 'default'}>
                      {activeMainTask.status}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="完成度">
                    {activeMainTask.completion}%
                  </Descriptions.Item>
                  <Descriptions.Item label="截止日期">{activeMainTask.dueDate}</Descriptions.Item>
                </Descriptions>
              </>
            )}

            <ProCard
              title="子任务列表"
              extra={
                <Button
                  icon={<PlusOutlined />}
                  disabled={activeMainTaskArchived}
                  loading={addSubTaskMutation.isPending}
                  onClick={() => activeMainTaskId && addSubTaskMutation.mutate(activeMainTaskId)}
                >
                  新增子任务
                </Button>
              }
            >
              <ProTable<MultiTaskSubTaskDto>
                rowKey="id"
                search={false}
                options={false}
                size={tableSize}
                loading={subTaskQuery.isLoading || updateSubTaskMutation.isPending}
                dataSource={subTaskQuery.data?.items || []}
                pagination={{ pageSize: 8 }}
                columns={[
                  {
                    title: '子任务名称',
                    dataIndex: 'title',
                    width: 240,
                    render: (_, row) => (
                      <TextArea
                        className="subtask-title-textarea"
                        autoSize={{ minRows: 1, maxRows: 5 }}
                        defaultValue={row.title}
                        disabled={activeMainTaskArchived}
                        onBlur={(event) => {
                          if (!activeMainTaskArchived && activeMainTaskId && event.target.value !== row.title) {
                            updateSubTaskMutation.mutate({
                              rowId: activeMainTaskId,
                              subTask: { ...row, title: event.target.value },
                            });
                          }
                        }}
                      />
                    ),
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 130,
                    render: (_, row) => (
                      <Select
                        value={row.status}
                        disabled={activeMainTaskArchived}
                        options={['未开始', '进行中', '已完成'].map((item) => ({ label: item, value: item }))}
                        onChange={(value) => {
                          if (!activeMainTaskArchived && activeMainTaskId) {
                            updateSubTaskMutation.mutate({
                              rowId: activeMainTaskId,
                              subTask: { ...row, status: value },
                            });
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                    ),
                  },
                  {
                    title: '操作',
                    width: 90,
                    render: (_, row) => (
                      <Popconfirm
                        title="确认删除这个子任务？"
                        onConfirm={() => activeMainTaskId && deleteSubTaskMutation.mutate({ rowId: activeMainTaskId, subTaskId: row.id })}
                      >
                        <Button danger size="small" disabled={activeMainTaskArchived} loading={deleteSubTaskMutation.isPending}>删除</Button>
                      </Popconfirm>
                    ),
                  },
                ]}
                scroll={{ x: 900 }}
              />
            </ProCard>
          </div>
        </Drawer>
      </div>
    </PageContainer>
  );
}

function renderSelect<K extends keyof MultiTaskRowDto>(
  row: MultiTaskRowDto,
  key: K,
  options: string[],
  updateRow: (id: string, key: K, value: MultiTaskRowDto[K]) => void,
  disabled = false,
) {
  return (
    <Select
      value={row[key] as string}
      disabled={disabled}
      options={options.map((item) => ({ label: item, value: item }))}
      onChange={(value) => updateRow(row.id, key, value as MultiTaskRowDto[K])}
      style={{ width: '100%' }}
    />
  );
}

function buildColumnFilters(options: string[]) {
  return options.map((item) => ({ text: item, value: item }));
}

function mergeOptions<T extends string>(source: string[], fallback: T[]) {
  return Array.from(new Set([...source, ...fallback])) as T[];
}

function isArchivedRow(row: MultiTaskRowDto) {
  return row.status === '存档';
}

function getStatusClassName(status: MultiTaskRowDto['status']) {
  if (status === '执行中') {
    return 'running';
  }
  if (status === '已完成') {
    return 'completed';
  }
  if (status === '存档') {
    return 'archived';
  }
  return 'pending';
}

function renderStatus(
  row: MultiTaskRowDto,
  options: string[],
  updateRow: (id: string, key: 'status', value: MultiTaskRowDto['status']) => void,
) {
  return (
    <Select
      value={row.status}
      options={options.map((item) => ({ label: item, value: item }))}
      onChange={(value) => updateRow(row.id, 'status', value)}
      onClick={(event) => event.stopPropagation()}
      style={{ width: '100%' }}
    />
  );
}

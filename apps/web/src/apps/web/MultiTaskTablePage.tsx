import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { PageContainer, ProCard, ProTable } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Descriptions, Drawer, Input, InputNumber, Popconfirm, Select, Space, Statistic, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  addMultiTaskRow,
  addMultiTaskSubTask,
  deleteMultiTaskRow,
  deleteMultiTaskSubTask,
  getMultiTaskTable,
  listMultiTaskSubTasks,
  saveMultiTaskTable,
  updateMultiTaskRow,
  updateMultiTaskSubTask,
  type MultiTaskRowDto,
  type MultiTaskSubTaskDto,
  type MultiTaskSubTaskPayload,
  type MultiTaskTablePayload,
} from '../../api/app';
import { useAppPreferences } from '../../stores/appPreferences';

const emptySummary = { applyCount: 0, patchCount: 0, approveCount: 0, completed: 0 };

export function MultiTaskTablePage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const tableSize = useAppPreferences((state) => state.tableSize);
  const tableQuery = useQuery({ queryKey: ['mock-multi-task-table'], queryFn: getMultiTaskTable });
  const [draftRows, setDraftRows] = useState<MultiTaskRowDto[]>([]);
  const [activeMainTaskId, setActiveMainTaskId] = useState<string | null>(null);

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

  const saveMutation = useMutation({
    mutationFn: saveMultiTaskTable,
    onSuccess: (data) => {
      applyServerPayload(data);
      message.success('多维表格数据已保存到后端 mock');
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

  const rows = draftRows;
  const activeMainTask = rows.find((row) => row.id === activeMainTaskId);
  const summary = tableQuery.data?.summary || emptySummary;
  const selectOptions = useMemo(
    () => ({
      product: tableQuery.data?.options.product || [],
      environment: tableQuery.data?.options.environment || [],
      origin: tableQuery.data?.options.origin || [],
      region: tableQuery.data?.options.region || [],
      city: tableQuery.data?.options.city || [],
      priority: tableQuery.data?.options.priority || [],
      status: tableQuery.data?.options.status || [],
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

  return (
    <PageContainer title="多维任务表格" subTitle="可填写、可新增、可删除的多维任务矩阵">
      <div className="page-stack">
        <Space size={16} wrap>
          <ProCard style={{ width: 180 }}>
            <Statistic title="申请数量" value={summary.applyCount} />
          </ProCard>
          <ProCard style={{ width: 180 }}>
            <Statistic title="补件数量" value={summary.patchCount} />
          </ProCard>
          <ProCard style={{ width: 180 }}>
            <Statistic title="审批数量" value={summary.approveCount} />
          </ProCard>
          <ProCard style={{ width: 180 }}>
            <Statistic title="完成行数" value={summary.completed} />
          </ProCard>
        </Space>

        <ProCard
          title="任务矩阵"
          extra={
            <Space>
              <Button icon={<PlusOutlined />} loading={addMutation.isPending} onClick={() => addMutation.mutate()}>
                新增行
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(draftRows)}
              >
                保存
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
                title: '主任务编号',
                dataIndex: 'id',
                fixed: 'left',
                width: 120,
                render: (_, row) => (
                  <Button type="link" onClick={() => setActiveMainTaskId(row.id)}>
                    {row.id}
                  </Button>
                ),
              },
              {
                title: '基础维度',
                children: [
                  { title: '产品', dataIndex: 'product', width: 150, render: (_, row) => renderSelect(row, 'product', selectOptions.product, updateAndPersist) },
                  {
                    title: '负责人',
                    dataIndex: 'owner',
                    width: 150,
                    render: (_, row) => (
                      <Input
                        value={row.owner}
                        placeholder="填写负责人"
                        onChange={(event) => patchDraftRow(row.id, 'owner', event.target.value)}
                        onBlur={() => persistDraftRow(row.id)}
                      />
                    ),
                  },
                  { title: '优先级', dataIndex: 'priority', width: 130, render: (_, row) => renderSelect(row, 'priority', selectOptions.priority, updateAndPersist) },
                ],
              },
              {
                title: '区域维度',
                children: [
                  { title: '环境', dataIndex: 'environment', width: 140, render: (_, row) => renderSelect(row, 'environment', selectOptions.environment, updateAndPersist) },
                  { title: '产地', dataIndex: 'origin', width: 140, render: (_, row) => renderSelect(row, 'origin', selectOptions.origin, updateAndPersist) },
                  { title: '地区', dataIndex: 'region', width: 140, render: (_, row) => renderSelect(row, 'region', selectOptions.region, updateAndPersist) },
                  { title: '城市', dataIndex: 'city', width: 140, render: (_, row) => renderSelect(row, 'city', selectOptions.city, updateAndPersist) },
                ],
              },
              {
                title: '任务数量',
                children: [
                  { title: '申请', dataIndex: 'applyCount', width: 120, render: (_, row) => renderNumber(row, 'applyCount', updateAndPersist) },
                  { title: '补件', dataIndex: 'patchCount', width: 120, render: (_, row) => renderNumber(row, 'patchCount', updateAndPersist) },
                  { title: '审批', dataIndex: 'approveCount', width: 120, render: (_, row) => renderNumber(row, 'approveCount', updateAndPersist) },
                ],
              },
              {
                title: '执行信息',
                children: [
                  { title: '状态', dataIndex: 'status', width: 140, render: (_, row) => renderStatus(row, selectOptions.status, updateAndPersist) },
                  {
                    title: '子任务',
                    dataIndex: 'subTaskCount',
                    width: 120,
                    render: (_, row) => (
                      <Button size="small" onClick={() => setActiveMainTaskId(row.id)}>
                        {row.subTaskCount || 0} 个
                      </Button>
                    ),
                  },
                  {
                    title: '备注',
                    dataIndex: 'remark',
                    width: 220,
                    render: (_, row) => (
                      <Input
                        value={row.remark}
                        placeholder="填写备注"
                        onChange={(event) => patchDraftRow(row.id, 'remark', event.target.value)}
                        onBlur={() => persistDraftRow(row.id)}
                      />
                    ),
                  },
                ],
              },
              {
                title: '操作',
                fixed: 'right',
                width: 100,
                render: (_, row) => (
                  <Popconfirm title="确认删除这一行？" onConfirm={() => deleteMutation.mutate(row.id)}>
                    <Button danger size="small" loading={deleteMutation.isPending}>删除</Button>
                  </Popconfirm>
                ),
              },
            ]}
            scroll={{ x: 1700 }}
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
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="主任务编号">{activeMainTask.id}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={activeMainTask.status === '已完成' ? 'success' : activeMainTask.status === '执行中' ? 'processing' : 'default'}>
                    {activeMainTask.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="产品">{activeMainTask.product}</Descriptions.Item>
                <Descriptions.Item label="负责人">{activeMainTask.owner || '-'}</Descriptions.Item>
                <Descriptions.Item label="区域">
                  {activeMainTask.environment} / {activeMainTask.origin} / {activeMainTask.region} / {activeMainTask.city}
                </Descriptions.Item>
                <Descriptions.Item label="备注">{activeMainTask.remark || '-'}</Descriptions.Item>
              </Descriptions>
            )}

            <ProCard
              title="子任务列表"
              extra={
                <Button
                  icon={<PlusOutlined />}
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
                  { title: '子任务编号', dataIndex: 'id', width: 120 },
                  {
                    title: '子任务名称',
                    dataIndex: 'title',
                    width: 180,
                    render: (_, row) => (
                      <Input
                        defaultValue={row.title}
                        onBlur={(event) => {
                          if (activeMainTaskId && event.target.value !== row.title) {
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
                    title: '负责人',
                    dataIndex: 'assignee',
                    width: 140,
                    render: (_, row) => (
                      <Input
                        defaultValue={row.assignee}
                        onBlur={(event) => {
                          if (activeMainTaskId && event.target.value !== row.assignee) {
                            updateSubTaskMutation.mutate({
                              rowId: activeMainTaskId,
                              subTask: { ...row, assignee: event.target.value },
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
                        options={['未开始', '进行中', '已完成'].map((item) => ({ label: item, value: item }))}
                        onChange={(value) => {
                          if (activeMainTaskId) {
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
                    title: '工作量',
                    dataIndex: 'workload',
                    width: 110,
                    render: (_, row) => (
                      <InputNumber
                        min={0}
                        value={row.workload}
                        onChange={(value) => {
                          if (activeMainTaskId) {
                            updateSubTaskMutation.mutate({
                              rowId: activeMainTaskId,
                              subTask: { ...row, workload: Number(value || 0) },
                            });
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                    ),
                  },
                  {
                    title: '截止日期',
                    dataIndex: 'dueDate',
                    width: 150,
                    render: (_, row) => (
                      <Input
                        defaultValue={row.dueDate}
                        placeholder="YYYY-MM-DD"
                        onBlur={(event) => {
                          if (activeMainTaskId && event.target.value !== row.dueDate) {
                            updateSubTaskMutation.mutate({
                              rowId: activeMainTaskId,
                              subTask: { ...row, dueDate: event.target.value },
                            });
                          }
                        }}
                      />
                    ),
                  },
                  {
                    title: '备注',
                    dataIndex: 'remark',
                    render: (_, row) => (
                      <Input
                        defaultValue={row.remark}
                        onBlur={(event) => {
                          if (activeMainTaskId && event.target.value !== row.remark) {
                            updateSubTaskMutation.mutate({
                              rowId: activeMainTaskId,
                              subTask: { ...row, remark: event.target.value },
                            });
                          }
                        }}
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
                        <Button danger size="small" loading={deleteSubTaskMutation.isPending}>删除</Button>
                      </Popconfirm>
                    ),
                  },
                ]}
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
) {
  return (
    <Select
      value={row[key] as string}
      options={options.map((item) => ({ label: item, value: item }))}
      onChange={(value) => updateRow(row.id, key, value as MultiTaskRowDto[K])}
      style={{ width: '100%' }}
    />
  );
}

function renderNumber<K extends 'applyCount' | 'patchCount' | 'approveCount'>(
  row: MultiTaskRowDto,
  key: K,
  updateRow: (id: string, key: K, value: number) => void,
) {
  return (
    <InputNumber<number>
      min={0}
      value={row[key]}
      onChange={(value) => updateRow(row.id, key, Number(value || 0))}
      style={{ width: '100%' }}
    />
  );
}

function renderStatus(
  row: MultiTaskRowDto,
  options: string[],
  updateRow: (id: string, key: 'status', value: MultiTaskRowDto['status']) => void,
) {
  return (
    <Space>
      <Select
        value={row.status}
        options={options.map((item) => ({ label: item, value: item }))}
        onChange={(value) => updateRow(row.id, 'status', value)}
        style={{ width: 100 }}
      />
      <Tag color={row.status === '已完成' ? 'success' : row.status === '执行中' ? 'processing' : 'default'}>
        {row.status}
      </Tag>
    </Space>
  );
}

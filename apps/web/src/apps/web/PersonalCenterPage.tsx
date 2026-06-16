import { ApiOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { PageContainer, ProCard, ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { Button, Descriptions, Drawer, Progress, Radio, Space, Statistic, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { getInvocationRecord, getInvocationSummary, type InvocationRecordDto } from '../../api/app';

type PeriodKey = 'day' | 'week' | 'month' | 'year';
type DetailKey = 'request_params' | 'response_params' | 'response_log';

export function PersonalCenterPage() {
  const [selectedRecord, setSelectedRecord] = useState<InvocationRecordDto | null>(null);
  const [activePeriod, setActivePeriod] = useState<PeriodKey>('week');
  const summaryQuery = useQuery({
    queryKey: ['invocation-summary'],
    queryFn: getInvocationSummary,
    refetchInterval: 5000,
  });
  const detailQuery = useQuery({
    queryKey: ['invocation-record', selectedRecord?.id],
    queryFn: () => getInvocationRecord(selectedRecord!.id),
    enabled: Boolean(selectedRecord),
  });
  const data = summaryQuery.data;
  const detailRecord = detailQuery.data || selectedRecord;
  const logs = data?.records || [];
  const failedCount = logs.filter((record) => !record.success).length;
  const activeDailyStats = data?.period_daily_stats?.[activePeriod] || data?.daily_stats || [];
  const maxDailyCount = Math.max(...(activeDailyStats.map((item) => item.count) || [1]), 1);
  const pathFilters = useMemo(
    () => Array.from(new Set(logs.map((item) => item.path).filter(Boolean))).map((path) => ({ text: path, value: path })),
    [logs],
  );

  return (
    <PageContainer title={false}>
      <div className="page-stack">
        <Space size={16} wrap>
          <ProCard className="analysis-stat-card">
            <Statistic title="接口日志" value={data?.summary.api_total || 0} prefix={<ApiOutlined />} suffix="条" />
          </ProCard>
          <ProCard className="analysis-stat-card">
            <Statistic title="成功调用" value={(data?.summary.api_total || 0) - failedCount} prefix={<CheckCircleOutlined />} suffix="条" />
          </ProCard>
          <ProCard className="analysis-stat-card">
            <Statistic title="失败调用" value={failedCount} prefix={<CloseCircleOutlined />} suffix="条" />
          </ProCard>
          <ProCard className="analysis-stat-card">
            <Statistic title="平均耗时" value={data?.summary.avg_duration_ms || 0} prefix={<ClockCircleOutlined />} suffix="ms" />
          </ProCard>
        </Space>

        <ProCard split="vertical" loading={summaryQuery.isLoading}>
          <ProCard
            title="接口调用趋势"
            extra={
              <Radio.Group value={activePeriod} onChange={(event) => setActivePeriod(event.target.value)}>
                <Radio.Button value="day">日</Radio.Button>
                <Radio.Button value="week">周</Radio.Button>
                <Radio.Button value="month">月</Radio.Button>
                <Radio.Button value="year">年</Radio.Button>
              </Radio.Group>
            }
          >
            <div className="daily-chart">
              {activeDailyStats.map((item) => (
                <div className="daily-chart-item" key={item.date}>
                  <div className="daily-chart-bar-wrap">
                    <div
                      className={`daily-chart-bar ${item.count === 0 ? 'daily-chart-bar-empty' : ''}`}
                      style={{ height: `${Math.max(8, (item.count / maxDailyCount) * 120)}px` }}
                    />
                  </div>
                  <Typography.Text className="daily-chart-count">{item.count}</Typography.Text>
                  <Typography.Text type="secondary" className="daily-chart-label">
                    {formatAxisLabel(item.date, activePeriod)}
                  </Typography.Text>
                </div>
              ))}
              {!activeDailyStats.length && <Typography.Text type="secondary">暂无日志趋势数据。</Typography.Text>}
            </div>
          </ProCard>
          <ProCard title="接口调用分布">
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              {(data?.menu_stats || []).map((item) => (
                <div key={item.name}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Typography.Text ellipsis style={{ maxWidth: 360 }}>{item.name}</Typography.Text>
                    <Typography.Text type="secondary">{item.count} 次</Typography.Text>
                  </Space>
                  <Progress percent={item.rate} size="small" showInfo />
                </div>
              ))}
              {!data?.menu_stats.length && <Typography.Text type="secondary">暂无接口日志。</Typography.Text>}
            </Space>
          </ProCard>
        </ProCard>

        <ProCard title="接口日志列表">
          <ProTable<InvocationRecordDto>
            rowKey="id"
            search={false}
            options={false}
            loading={summaryQuery.isLoading}
            dataSource={logs}
            pagination={{ pageSize: 12, showSizeChanger: true }}
            columns={[
              {
                title: '时间',
                dataIndex: 'created_at',
                width: 170,
              },
              {
                title: '接口名称',
                dataIndex: 'name',
                width: 260,
                ellipsis: true,
              },
              {
                title: '方法',
                dataIndex: 'method',
                width: 90,
                filters: ['GET', 'POST', 'PUT', 'DELETE'].map((method) => ({ text: method, value: method })),
                onFilter: (value, record) => record.method === value,
                render: (_, record) => <Tag color={getMethodColor(record.method)}>{record.method || '-'}</Tag>,
              },
              {
                title: '路径',
                dataIndex: 'path',
                ellipsis: true,
                filters: pathFilters,
                onFilter: (value, record) => record.path === value,
              },
              {
                title: '状态',
                dataIndex: 'success',
                width: 100,
                filters: [
                  { text: '成功', value: true },
                  { text: '失败', value: false },
                ],
                onFilter: (value, record) => record.success === value,
                render: (_, record) => (
                  <Tag color={record.success ? 'success' : 'error'}>{record.success ? '成功' : '失败'}</Tag>
                ),
              },
              { title: '状态码', dataIndex: 'status_code', width: 90 },
              { title: '耗时', dataIndex: 'duration_ms', width: 100, render: (_, record) => `${record.duration_ms}ms` },
              {
                title: '返回摘要',
                width: 240,
                render: (_, record) => (
                  <Typography.Text type="secondary" ellipsis style={{ maxWidth: 220 }}>
                    {getResponsePreview(record.detail)}
                  </Typography.Text>
                ),
              },
              {
                title: '操作',
                width: 90,
                fixed: 'right',
                render: (_, record) => (
                  <Button size="small" type="link" onClick={() => setSelectedRecord(record)}>
                    查看
                  </Button>
                ),
              },
            ]}
            scroll={{ x: 1280 }}
          />
        </ProCard>
      </div>

      <Drawer
        title="日志详情"
        width={760}
        open={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
      >
        {detailRecord && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="接口名称">{detailRecord.name}</Descriptions.Item>
              <Descriptions.Item label="请求路径">{detailRecord.path || '-'}</Descriptions.Item>
              <Descriptions.Item label="请求方法">
                <Tag color={getMethodColor(detailRecord.method)}>{detailRecord.method || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="调用结果">
                <Tag color={detailRecord.success ? 'success' : 'error'}>
                  {detailRecord.success ? '成功' : '失败'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态码">{detailRecord.status_code ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="接口耗时">{detailRecord.duration_ms}ms</Descriptions.Item>
              <Descriptions.Item label="调用时间">{detailRecord.created_at}</Descriptions.Item>
            </Descriptions>
            <LogBlock title="请求参数" loading={detailQuery.isFetching} content={formatDetailBlock(detailRecord.detail, 'request_params')} />
            <LogBlock title="响应参数" loading={detailQuery.isFetching} content={formatDetailBlock(detailRecord.detail, 'response_params')} />
            <LogBlock title="响应日志" loading={detailQuery.isFetching} content={formatDetailBlock(detailRecord.detail, 'response_log')} dark />
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
}

function LogBlock({ title, content, loading, dark = false }: { title: string; content: string; loading?: boolean; dark?: boolean }) {
  return (
    <ProCard title={title} loading={loading}>
      <pre className={dark ? 'log-box' : 'api-log-code'}>{content}</pre>
    </ProCard>
  );
}

function formatDetailBlock(detail: string, key: DetailKey) {
  if (!detail) {
    return '暂无记录。';
  }
  try {
    const parsed = JSON.parse(detail) as Record<string, unknown>;
    const value = parsed[key];
    return stringifyValue(value);
  } catch {
    return key === 'response_log' ? detail : '旧记录未保存该部分内容。';
  }
}

function stringifyValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '暂无记录。';
  }
  if (typeof value === 'string') {
    return tryFormatJsonText(value);
  }
  return JSON.stringify(value, null, 2);
}

function tryFormatJsonText(value: string) {
  const text = value.trim();
  if (!text || text === '无') {
    return value;
  }
  if (!text.startsWith('{') && !text.startsWith('[')) {
    return value;
  }
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return value;
  }
}

function getResponsePreview(detail: string) {
  const response = formatDetailBlock(detail, 'response_params');
  return response.length > 120 ? `${response.slice(0, 120)}...` : response;
}

function getMethodColor(method: string) {
  const colors: Record<string, string> = {
    GET: 'blue',
    POST: 'green',
    PUT: 'gold',
    DELETE: 'red',
  };
  return colors[method] || 'default';
}

function formatAxisLabel(value: string, period: PeriodKey) {
  if (period === 'day') {
    return value.slice(5);
  }
  if (period === 'week') {
    return value.replace('-W', ' 第') + '周';
  }
  if (period === 'month') {
    return `${Number(value.slice(5, 7))}月`;
  }
  return `${value}年`;
}

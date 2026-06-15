import { PageContainer, ProCard, ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { Progress, Space, Statistic, Tag, Typography } from 'antd';
import { getInvocationSummary, type InvocationRecordDto } from '../../api/app';

export function PersonalCenterPage() {
  const summaryQuery = useQuery({
    queryKey: ['invocation-summary'],
    queryFn: getInvocationSummary,
    refetchInterval: 5000,
  });
  const data = summaryQuery.data;
  const maxDailyCount = Math.max(...(data?.daily_stats.map((item) => item.count) || [1]), 1);

  return (
    <PageContainer title="历史调用记录" subTitle="菜单访问和接口调用会写入本地 SQLite，项目重启后仍然保留">
      <div className="page-stack">
        <Space size={16} wrap>
          <ProCard className="analysis-stat-card">
            <Statistic title="访问量" value={data?.summary.total || 0} />
          </ProCard>
          <ProCard className="analysis-stat-card">
            <Statistic title="日调用率" value={data?.summary.today || 0} suffix="次" />
          </ProCard>
          <ProCard className="analysis-stat-card">
            <Statistic title="菜单调用" value={data?.summary.menu_total || 0} suffix="次" />
          </ProCard>
          <ProCard className="analysis-stat-card">
            <Statistic title="接口成功率" value={data?.summary.api_success_rate || 0} precision={2} suffix="%" />
          </ProCard>
        </Space>

        <ProCard title="周期调用量" loading={summaryQuery.isLoading}>
          <div className="period-stat-grid">
            <PeriodStat label="日" value={data?.period_stats.day || 0} />
            <PeriodStat label="周" value={data?.period_stats.week || 0} />
            <PeriodStat label="月" value={data?.period_stats.month || 0} />
            <PeriodStat label="年" value={data?.period_stats.year || 0} />
          </div>
        </ProCard>

        <ProCard split="vertical" loading={summaryQuery.isLoading}>
          <ProCard title="菜单调用率">
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              {(data?.menu_stats || []).map((item) => (
                <div key={item.name}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Typography.Text>{item.name}</Typography.Text>
                    <Typography.Text type="secondary">{item.count} 次</Typography.Text>
                  </Space>
                  <Progress percent={item.rate} size="small" showInfo />
                </div>
              ))}
              {!data?.menu_stats.length && <Typography.Text type="secondary">暂无菜单访问记录。</Typography.Text>}
            </Space>
          </ProCard>
          <ProCard title="日调用趋势">
            <div className="daily-chart">
              {(data?.daily_stats || []).map((item) => (
                <div className="daily-chart-item" key={item.date}>
                  <div className="daily-chart-bar-wrap">
                    <div
                      className="daily-chart-bar"
                      style={{ height: `${Math.max(8, (item.count / maxDailyCount) * 120)}px` }}
                    />
                  </div>
                  <Typography.Text className="daily-chart-count">{item.count}</Typography.Text>
                  <Typography.Text type="secondary" className="daily-chart-label">
                    {item.date.slice(5)}
                  </Typography.Text>
                </div>
              ))}
              {!data?.daily_stats.length && <Typography.Text type="secondary">暂无调用趋势数据。</Typography.Text>}
            </div>
          </ProCard>
        </ProCard>

        <ProCard title="调用记录">
          <ProTable<InvocationRecordDto>
            rowKey="id"
            search={false}
            options={false}
            loading={summaryQuery.isLoading}
            dataSource={data?.records || []}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: '类型',
                dataIndex: 'record_type_label',
                width: 120,
                render: (_, record) => (
                  <Tag color={record.record_type === 'menu' ? 'blue' : 'purple'}>
                    {record.record_type_label}
                  </Tag>
                ),
              },
              { title: '名称', dataIndex: 'name', width: 220 },
              { title: '路径', dataIndex: 'path', ellipsis: true },
              { title: '方法', dataIndex: 'method', width: 90 },
              {
                title: '结果',
                dataIndex: 'success',
                width: 100,
                render: (_, record) => (
                  <Tag color={record.success ? 'success' : 'error'}>{record.success ? '成功' : '失败'}</Tag>
                ),
              },
              { title: '状态码', dataIndex: 'status_code', width: 90 },
              { title: '耗时', dataIndex: 'duration_ms', width: 100, render: (_, record) => `${record.duration_ms}ms` },
              { title: '时间', dataIndex: 'created_at', width: 180 },
            ]}
          />
        </ProCard>
      </div>
    </PageContainer>
  );
}

function PeriodStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="period-stat-item">
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Typography.Title level={3}>{value}</Typography.Title>
    </div>
  );
}

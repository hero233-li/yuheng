import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useMutation } from '@tanstack/react-query';
import { App, Button, Card, Col, Form, Input, Popconfirm, Row, Select, Space, Tabs, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import {
  claimGroupedTask,
  returnGroupedTask,
  searchGroupedCards,
  type GroupedTaskState,
} from '../../../api/app';

interface GroupedCardItem {
  name: string;
  english_name: string;
  chinese_name: string;
  active: string | number;
  added: number;
  category: string;
  group: 'A组' | 'B组';
  status: 'completed' | 'pending';
  description: string;
}

export function GroupedCardSearchPage() {
  const { message } = App.useApp();
  const [cards, setCards] = useState<GroupedCardItem[]>([]);
  const [activeGroup, setActiveGroup] = useState<'A组' | 'B组'>('A组');
  const [taskState, setTaskState] = useState<GroupedTaskState | null>(null);
  const searchMutation = useMutation({
    mutationFn: searchGroupedCards,
    onSuccess: (data) => {
      setCards(data.items);
      setTaskState(data.task);
      setActiveGroup(data.items.some((card) => card.group === 'A组') ? 'A组' : 'B组');
    },
  });
  const claimMutation = useMutation({
    mutationFn: claimGroupedTask,
    onSuccess: (data) => {
      setTaskState(data);
      message.success('任务已领取');
    },
  });
  const returnMutation = useMutation({
    mutationFn: returnGroupedTask,
    onSuccess: (data) => {
      setTaskState(data);
      message.success('任务已退回领取');
    },
  });

  const groupedCards = useMemo(() => {
    return cards.reduce<Record<string, GroupedCardItem[]>>((groups, card) => {
      groups[card.group] = [...(groups[card.group] || []), card];
      return groups;
    }, {});
  }, [cards]);
  const allCardsCompleted = cards.length > 0 && cards.every((card) => card.status === 'completed');

  function runSearch(values: { author?: string; rating?: string; keyword?: string }) {
    searchMutation.mutate({
      category: '全部',
      author: values.author,
      rating: values.rating,
      keyword: values.keyword,
    });
  }

  function updateCardStatus(name: string, status: GroupedCardItem['status']) {
    setCards((current) =>
      current.map((card) =>
        card.name === name
          ? {
              ...card,
              status,
              description: status === 'completed' ? `${card.group}任务已完成处理` : `${card.group}任务已取消完成状态`,
            }
          : card,
      ),
    );
  }

  function completeAllCards() {
    setCards((current) =>
      current.map((card) => ({
        ...card,
        status: 'completed',
        description: `${card.group}任务已完成处理`,
      })),
    );
    message.success('已一键完成全部卡片');
  }

  function supplementAllCards() {
    message.info('已触发一键补件 Mock 操作');
  }

  function submitCards() {
    message.success('提交成功');
  }

  function submitApproval() {
    message.success('已一键提交审批');
  }

  return (
    <PageContainer title={false}>
      <div className="page-stack">
        <ProCard>
          <Form layout="inline" onFinish={runSearch}>
            <Form.Item label="作者" name="author">
              <Select
                style={{ width: 220 }}
                placeholder="不限"
                options={[
                  { label: '不限', value: '' },
                  { label: '用户A', value: 'a' },
                  { label: '用户B', value: 'b' },
                ]}
              />
            </Form.Item>
            <Form.Item label="好评度" name="rating">
              <Select
                style={{ width: 220 }}
                placeholder="不限"
                options={[
                  { label: '不限', value: '' },
                  { label: '90%以上', value: '90' },
                  { label: '80%以上', value: '80' },
                ]}
              />
            </Form.Item>
            <Form.Item name="keyword">
              <Input placeholder="搜索关键字" style={{ width: 220 }} />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={searchMutation.isPending}>搜索</Button>
              <Button
                onClick={() => {
                  setCards([]);
                  setTaskState(null);
                }}
              >
                重置
              </Button>
            </Space>
          </Form>
        </ProCard>

        {cards.length === 0 && (
          <ProCard>
            <Typography.Text type="secondary">点击搜索后按 A 组、B 组页签切换展示卡片任务。</Typography.Text>
          </ProCard>
        )}

        {cards.length > 0 && (
          <ProCard>
            {taskState && (
              <div className="grouped-task-toolbar">
                <Space size={16} wrap>
                  <Typography.Text>
                    任务状态：<Tag color={taskState.task_status === 'claimed' ? 'success' : 'default'}>{taskState.task_status_label}</Tag>
                  </Typography.Text>
                  <Typography.Text>
                    当前节点：<Tag color="blue">{taskState.current_node}</Tag>
                  </Typography.Text>
                  {taskState.task_status === 'unclaimed' ? (
                    <Button
                      type="primary"
                      loading={claimMutation.isPending}
                      onClick={() => claimMutation.mutate()}
                    >
                      领取
                    </Button>
                  ) : (
                    <Button
                      danger
                      loading={returnMutation.isPending}
                      onClick={() => returnMutation.mutate()}
                    >
                      退回领取
                    </Button>
                  )}
                </Space>
                <Space wrap>
                  <Popconfirm
                    placement="top"
                    title="是否确定一键完成？"
                    onConfirm={completeAllCards}
                  >
                    <Button>一键完成</Button>
                  </Popconfirm>
                  <Popconfirm
                    placement="top"
                    title="是否确定一键补件？"
                    onConfirm={supplementAllCards}
                  >
                    <Button>一键补件</Button>
                  </Popconfirm>
                  <Button type="primary" disabled={!allCardsCompleted} onClick={submitCards}>
                    提交
                  </Button>
                  <Button type="primary" disabled={!allCardsCompleted} onClick={submitApproval}>
                    一键提交审批
                  </Button>
                </Space>
              </div>
            )}
            <Tabs
              activeKey={activeGroup}
              onChange={(key) => setActiveGroup(key as 'A组' | 'B组')}
              items={(['A组', 'B组'] as const).map((groupName) => ({
                key: groupName,
                label: `${groupName} (${groupedCards[groupName]?.length || 0})`,
                children: <GroupedCardGrid cards={groupedCards[groupName] || []} onStatusChange={updateCardStatus} />,
              }))}
            />
          </ProCard>
        )}
      </div>
    </PageContainer>
  );
}

function GroupedCardGrid({
  cards,
  onStatusChange,
}: {
  cards: GroupedCardItem[];
  onStatusChange: (name: string, status: GroupedCardItem['status']) => void;
}) {
  if (cards.length === 0) {
    return (
      <ProCard>
        <Typography.Text type="secondary">当前分组暂无结果。</Typography.Text>
      </ProCard>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {cards.map((item) => (
        <Col span={6} key={item.name}>
          <Card
            className={`search-result-card grouped-status-card grouped-status-card-${item.status}`}
            actions={[
              <Button
                key="complete"
                type={item.status === 'pending' ? 'primary' : 'default'}
                disabled={item.status === 'completed'}
                onClick={() => onStatusChange(item.name, 'completed')}
              >
                完成
              </Button>,
              <Button
                key="cancel"
                danger
                type={item.status === 'completed' ? 'primary' : 'default'}
                disabled={item.status === 'pending'}
                onClick={() => onStatusChange(item.name, 'pending')}
              >
                取消
              </Button>,
            ]}
          >
            <div>
              <Space align="center" wrap>
                <div>
                  <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 0 }}>
                    {item.chinese_name}
                  </Typography.Title>
                  <Typography.Text type="secondary">{item.english_name}</Typography.Text>
                </div>
                <Tag color={item.status === 'completed' ? 'success' : 'warning'}>
                  {item.status === 'completed' ? '已完成' : '未完成'}
                </Tag>
              </Space>
              </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

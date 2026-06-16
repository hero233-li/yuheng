import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useMutation } from '@tanstack/react-query';
import { App, Button, Card, Col, Form, Input, Popconfirm, Row, Select, Space, Tabs, Tag, Typography } from 'antd';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
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
  const [form] = Form.useForm();

  const location = useLocation();
  const [searchParams] = useSearchParams();

  const currentPageKey = searchParams.get('tabKey') || location.pathname;

  const formCacheKey = `grouped-card-form:${currentPageKey}`;
  const cardsCacheKey = `grouped-card-cards:${currentPageKey}`;
  const taskStateCacheKey = `grouped-card-task-state:${currentPageKey}`;
  const activeGroupCacheKey = `grouped-card-active-group:${currentPageKey}`;

  const [cards, setCards] = useState<GroupedCardItem[]>(() => {
    const cached = sessionStorage.getItem(cardsCacheKey);

    if (!cached) {
      return [];
    }

    try {
      return JSON.parse(cached) as GroupedCardItem[];
    } catch {
      sessionStorage.removeItem(cardsCacheKey);
      return [];
    }
  });

  const [activeGroup, setActiveGroup] = useState<'A组' | 'B组'>(() => {
    const cached = sessionStorage.getItem(activeGroupCacheKey);
    return cached === 'B组' ? 'B组' : 'A组';
  });

  const [taskState, setTaskState] = useState<GroupedTaskState | null>(() => {
    const cached = sessionStorage.getItem(taskStateCacheKey);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as GroupedTaskState;
    } catch {
      sessionStorage.removeItem(taskStateCacheKey);
      return null;
    }
  });
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  function setButtonLoading(key: string, loading: boolean) {
  setActionLoading((current) => ({
    ...current,
    [key]: loading,
  }));
}
// 后续删除
function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
async function runWithLoading(key: string, action: () => void | Promise<void>) {
  setButtonLoading(key, true);
  try {
    await sleep(300);
    await action();
  } finally {
    setButtonLoading(key, false);
  }
  try {
    await action();
  } finally {
    setButtonLoading(key, false);
  }
}

  useLayoutEffect(() => {
    const cached = sessionStorage.getItem(formCacheKey);

    if (cached) {
      try {
        form.setFieldsValue(JSON.parse(cached));
        return;
      } catch {
        sessionStorage.removeItem(formCacheKey);
      }
    }

    form.resetFields();
  }, [currentPageKey, form, formCacheKey]);

  useEffect(() => {
    const cachedCards = sessionStorage.getItem(cardsCacheKey);

    if (cachedCards) {
      try {
        setCards(JSON.parse(cachedCards) as GroupedCardItem[]);
      } catch {
        sessionStorage.removeItem(cardsCacheKey);
        setCards([]);
      }
    } else {
      setCards([]);
    }

    const cachedTaskState = sessionStorage.getItem(taskStateCacheKey);

    if (cachedTaskState) {
      try {
        setTaskState(JSON.parse(cachedTaskState) as GroupedTaskState);
      } catch {
        sessionStorage.removeItem(taskStateCacheKey);
        setTaskState(null);
      }
    } else {
      setTaskState(null);
    }

    const cachedActiveGroup = sessionStorage.getItem(activeGroupCacheKey);
    setActiveGroup(cachedActiveGroup === 'B组' ? 'B组' : 'A组');
  }, [currentPageKey, cardsCacheKey, taskStateCacheKey, activeGroupCacheKey]);



  const searchMutation = useMutation({
    mutationFn: searchGroupedCards,
    onSuccess: (data) => {
      const nextActiveGroup = data.items.some((card) => card.group === 'A组') ? 'A组' : 'B组';

      setCards(data.items);
      setTaskState(data.task);
      setActiveGroup(nextActiveGroup);

      sessionStorage.setItem(cardsCacheKey, JSON.stringify(data.items));
      sessionStorage.setItem(taskStateCacheKey, JSON.stringify(data.task));
      sessionStorage.setItem(activeGroupCacheKey, nextActiveGroup);
    },
  });
  const claimMutation = useMutation({
    mutationFn: claimGroupedTask,
    onSuccess: (data) => {
      setTaskState(data);
      sessionStorage.setItem(taskStateCacheKey, JSON.stringify(data));
      message.success('任务已领取');
    },
  });
  const returnMutation = useMutation({
    mutationFn: returnGroupedTask,
    onSuccess: (data) => {
      setTaskState(data);
      sessionStorage.setItem(taskStateCacheKey, JSON.stringify(data));
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

  async function updateCardStatus(name: string, status: GroupedCardItem['status']) {
  const loadingKey = status === 'completed' ? `card-complete:${name}` : `card-cancel:${name}`;

  await runWithLoading(loadingKey, async () => {
    setCards((current) => {
      const next = current.map((card) =>
        card.name === name
          ? {
              ...card,
              status,
              description:
                status === 'completed'
                  ? `${card.group}任务已完成处理`
                  : `${card.group}任务已取消完成状态`,
            }
          : card,
      );

      sessionStorage.setItem(cardsCacheKey, JSON.stringify(next));
      return next;
    });
  });
}

async function completeAllCards() {

  await runWithLoading('completeAll', async () => {
    setCards((current) => {
      const next = current.map((card) => ({
        ...card,
        status: 'completed' as const,
        description: `${card.group}任务已完成处理`,
      }));

      sessionStorage.setItem(cardsCacheKey, JSON.stringify(next));
      return next;
    });

    message.success('已一键完成全部卡片');
  });
}
async function supplementAllCards() {
  await runWithLoading('supplementAll', async () => {
    message.info('已触发一键补件 Mock 操作');
  });
}

  async function submitCards() {
  await runWithLoading('submitCards', async () => {
    message.success('提交成功');
  });
}

async function submitApproval() {
  await runWithLoading('submitApproval', async () => {
    message.success('已一键提交审批');
  });
}
  return (
      <PageContainer title={false}>
        <div className="page-stack">
          <ProCard>
            <Form
                key={currentPageKey}
                form={form}
                layout="inline"
                onValuesChange={() => {
                  setTimeout(() => {
                    sessionStorage.setItem(formCacheKey, JSON.stringify(form.getFieldsValue(true)));
                  }, 0);
                }}
                onFinish={runSearch}
            >
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
                      form.resetFields();

                      setCards([]);
                      setTaskState(null);
                      setActiveGroup('A组');

                      sessionStorage.removeItem(formCacheKey);
                      sessionStorage.removeItem(cardsCacheKey);
                      sessionStorage.removeItem(taskStateCacheKey);
                      sessionStorage.removeItem(activeGroupCacheKey);
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
  <Button loading={actionLoading.completeAll}>一键完成</Button>
</Popconfirm>
<Popconfirm
  placement="top"
  title="是否确定一键补件？"
  onConfirm={supplementAllCards}
>
  <Button loading={actionLoading.supplementAll}>一键补件</Button>
</Popconfirm>
                        <Button
  type="primary"
  loading={actionLoading.submitCards}
  disabled={!allCardsCompleted || actionLoading.submitCards}
  onClick={submitCards}
>
  提交
</Button>
                        <Button
  type="primary"
  loading={actionLoading.submitApproval}
  disabled={!allCardsCompleted || actionLoading.submitApproval}
  onClick={submitApproval}
>
  一键提交审批
</Button>
                      </Space>
                    </div>
                )}
                <Tabs
                    activeKey={activeGroup}
                    onChange={(key) => {
                      const nextGroup = key as 'A组' | 'B组';
                      setActiveGroup(nextGroup);
                      sessionStorage.setItem(activeGroupCacheKey, nextGroup);
                    }}
                    items={(['A组', 'B组'] as const).map((groupName) => ({
                      key: groupName,
                      label: `${groupName} (${groupedCards[groupName]?.length || 0})`,
                      children: (
  <GroupedCardGrid
    cards={groupedCards[groupName] || []}
    onStatusChange={updateCardStatus}
    actionLoading={actionLoading}
  />
),
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
  actionLoading,
}: {
  cards: GroupedCardItem[];
  onStatusChange: (name: string, status: GroupedCardItem['status']) => void;
  actionLoading: Record<string, boolean>;
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
  loading={actionLoading[`card-complete:${item.name}`]}
  onClick={() => onStatusChange(item.name, 'completed')}
>
  完成
</Button>,
                   <Button
  key="cancel"
  danger
  type={item.status === 'completed' ? 'primary' : 'default'}
  disabled={item.status === 'pending'}
  loading={actionLoading[`card-cancel:${item.name}`]}
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

import { DownloadOutlined, EditOutlined, MoreOutlined, ShareAltOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Avatar, Button, Card, Col, Divider, Form, Input, Row, Select, Space, Tag, Typography } from 'antd';
import { useState } from 'react';

const categories = ['全部', '类目1', '类目2', '类目3', '类目4', '类目5', '类目6', '类目7', '类目8', '类目9', '类目10', '类目11'];

const allCards = [
  { name: 'Alipay', icon: '支', color: '#4aa8ff', active: '1万', added: 484, category: '类目1' },
  { name: 'Angular', icon: 'A', color: '#d33242', active: 3306, added: 577, category: '类目2' },
  { name: 'Ant Design', icon: '◇', color: '#6c8cff', active: 7083, added: 756, category: '类目3' },
  { name: 'Ant Design Pro', icon: 'Pro', color: '#111827', active: 9472, added: 463, category: '类目4' },
  { name: 'Bootstrap', icon: 'B', color: '#7952b3', active: 7553, added: 119, category: '类目5' },
  { name: 'React', icon: 'R', color: '#61dafb', active: 3856, added: 824, category: '类目6' },
  { name: 'Vue', icon: 'V', color: '#42b883', active: 8341, added: 480, category: '类目7' },
  { name: 'Webpack', icon: 'W', color: '#5b7cfa', active: 9714, added: 448, category: '类目8' },
];

export function CardSearchPage() {
  const [cards, setCards] = useState<typeof allCards>([]);
  const [activeCategory, setActiveCategory] = useState('全部');

  function runSearch(values: { author?: string; rating?: string }) {
    const filtered = allCards.filter((card) => activeCategory === '全部' || card.category === activeCategory);
    setCards(filtered.map((card) => ({ ...card, name: values.author ? `${card.name}` : card.name })));
  }

  return (
    <PageContainer title="卡片式搜索表单" subTitle="搜索后以卡片形式展示结果">
      <div className="page-stack">
        <ProCard>
          <div className="category-row">
            <Typography.Text strong>所属类目：</Typography.Text>
            {categories.map((category) => (
              <Button
                key={category}
                type={activeCategory === category ? 'primary' : 'text'}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
            <Button type="link">展开</Button>
          </div>
          <Divider />
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
              <Button type="primary" htmlType="submit">搜索</Button>
              <Button onClick={() => setCards([])}>重置</Button>
            </Space>
          </Form>
        </ProCard>

        <Row gutter={[16, 16]}>
          {cards.map((item) => (
            <Col span={6} key={item.name}>
              <Card
                className="search-result-card"
                actions={[
                  <DownloadOutlined key="download" />,
                  <EditOutlined key="edit" />,
                  <ShareAltOutlined key="share" />,
                  <MoreOutlined key="more" />,
                ]}
              >
                <Space align="start" size={14}>
                  <Avatar style={{ background: item.color }}>{item.icon}</Avatar>
                  <div>
                    <Typography.Title level={4} style={{ marginTop: 0 }}>{item.name}</Typography.Title>
                    <Space size={34}>
                      <div>
                        <Typography.Text type="secondary">活跃用户</Typography.Text>
                        <Typography.Title level={3}>{item.active}</Typography.Title>
                      </div>
                      <div>
                        <Typography.Text type="secondary">新增用户</Typography.Text>
                        <Typography.Title level={3}>{item.added}</Typography.Title>
                      </div>
                    </Space>
                    <Tag color="blue">{item.category}</Tag>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
        {cards.length === 0 && (
          <ProCard>
            <Typography.Text type="secondary">点击搜索后展示卡片结果。</Typography.Text>
          </ProCard>
        )}
      </div>
    </PageContainer>
  );
}

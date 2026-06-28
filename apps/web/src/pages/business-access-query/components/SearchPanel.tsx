import { Button, Card, Col, Form, Input, Row, Space, type FormInstance } from 'antd';
import { RotateCcw, Search } from 'lucide-react';
import type { BusinessAccessSearchValues } from '../types';

interface SearchPanelProps {
  form: FormInstance<BusinessAccessSearchValues>;
  busy: boolean;
  searching: boolean;
  onSearch: (values: BusinessAccessSearchValues) => void;
}

export default function SearchPanel({ form, busy, searching, onSearch }: SearchPanelProps) {
  return (
    <Card title="查询条件">
      <Form<BusinessAccessSearchValues>
        form={form}
        layout="vertical"
        disabled={busy}
        onFinish={onSearch}
      >
        <Row gutter={[16, 4]}>
          <Col xs={24} md={12}>
            <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请填写姓名' }]}>
              <Input placeholder="请输入姓名" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="certificateNo"
              label="身份证号"
              rules={[{ required: true, message: '请填写身份证号' }]}
            >
              <Input maxLength={18} placeholder="请输入身份证号" />
            </Form.Item>
          </Col>
        </Row>
        <div className="portable-business-access__actions">
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<Search size={16} />}
              loading={searching}
              disabled={busy}
            >
              查询
            </Button>
            <Button
              icon={<RotateCcw size={16} />}
              disabled={busy}
              onClick={() => form.resetFields()}
            >
              重置
            </Button>
          </Space>
        </div>
      </Form>
    </Card>
  );
}

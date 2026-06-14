import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Empty } from 'antd';

interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <PageContainer title={title}>
      <ProCard>
        <Empty description="页面占位，后续按业务补充" />
      </ProCard>
    </PageContainer>
  );
}

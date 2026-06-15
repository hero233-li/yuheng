# 前端维护与扩展指南

本文说明当前前端如何维护、如何新增页面、如何新增接口、如何扩展搜索字段，以及如何做不同形态的搜索结果页。

## 目录结构

主要前端代码在：

```text
apps/web/src
```

常用目录：

| 路径 | 作用 |
| --- | --- |
| `apps/web/src/main.tsx` | 路由入口 |
| `apps/web/src/components/AppShell.tsx` | 左侧菜单、顶部导航、页签、面包屑、头像 |
| `apps/web/src/apps/web/` | 本机页面 |
| `apps/web/src/api/` | 前端请求后端接口 |
| `apps/web/src/stores/` | 前端状态，如登录、外观、菜单配置 |
| `apps/web/src/types/` | 前端类型定义 |

## 新增一个页面

假设新增页面 A。

### 1. 新建页面文件

例如：

```text
apps/web/src/apps/web/PageA.tsx
```

示例：

```tsx
import { PageContainer, ProCard } from '@ant-design/pro-components';

export function PageA() {
  return (
    <PageContainer title="页面A">
      <ProCard>
        页面A内容
      </ProCard>
    </PageContainer>
  );
}
```

### 2. 加路由

修改：

```text
apps/web/src/main.tsx
```

导入页面：

```ts
import { PageA } from './apps/web/PageA';
```

在 `appRoutes` 里添加：

```ts
{ path: 'page-a', element: <PageA /> }
```

访问路径就是：

```text
/page-a
```

### 3. 加菜单

修改：

```text
apps/web/src/components/AppShell.tsx
```

在 `menuItems` 里添加：

```ts
{
  key: '/page-a',
  label: '页面A',
}
```

如果放在一级菜单一下面：

```ts
{
  key: 'group-one',
  label: '一级菜单一',
  children: [
    { key: '/page-a', label: '页面A' },
  ],
}
```

### 4. 加菜单页签配置

修改：

```text
apps/web/src/stores/appPreferences.ts
```

在 `defaultPreferences.menuTabModes` 里加：

```ts
'/page-a': 'single'
```

含义：

```text
single：点击菜单复用同一个页签
multi：每次点击可以打开 页面A-1 / 页面A-2
```

如果希望系统设置里可以配置这个菜单，还要改：

```text
apps/web/src/apps/web/SettingsPage.tsx
```

在 `menuSettings` 里加：

```ts
{ path: '/page-a', label: '页面A' }
```

## 新增接口

接口统一放在：

```text
apps/web/src/api/
```

本机接口：

```text
apps/web/src/api/app.ts
```

### 示例：新增页面 A 的查询接口

后端接口：

```text
GET /api/page-a/items/
```

前端在 `app.ts` 中添加：

```ts
export async function listPageAItems() {
  const { data } = await apiClient.get('/page-a/items/');
  return data;
}
```

页面里使用：

```tsx
import { useQuery } from '@tanstack/react-query';
import { listPageAItems } from '../../api/app';

const query = useQuery({
  queryKey: ['page-a-items'],
  queryFn: listPageAItems,
});
```

### 示例：新增提交接口

后端接口：

```text
POST /api/page-a/search/
```

前端：

```ts
export async function searchPageA(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/page-a/search/', payload);
  return data;
}
```

页面里：

```tsx
const mutation = useMutation({
  mutationFn: searchPageA,
  onSuccess: (data) => {
    // 更新结果区
  },
});
```

## 新增字段

当前“执行产品申请流程”的字段配置在：

```text
apps/web/src/apps/web/searchFormConfig.ts
```

如果是公共字段，改：

```ts
const commonFields = [...]
```

例如新增“邮箱”：

```ts
{
  name: 'email',
  label: '邮箱',
  type: 'input',
  span: 6,
  editable: true,
  visible: true,
  submit: true,
  required: false,
  placeholder: '请输入邮箱',
}
```

如果只有某个产品需要，放到该产品的 `extraFields`：

```ts
extraFields: [
  {
    name: 'serviceLevel',
    label: '服务等级',
    type: 'select',
    span: 6,
    editable: true,
    visible: true,
    submit: true,
    required: true,
    options: [
      { label: '普通', value: 'normal' },
      { label: '加急', value: 'urgent' },
    ],
  },
]
```

如果产品 A 必填、产品 B 不必填，用 `fieldOverrides`：

```ts
fieldOverrides: {
  personName: { required: true },
}
```

## 搜索栏怎么做

当前通用思路有两种。

### 方式一：配置驱动搜索栏

适合字段多、字段经常变化、有产品联动的页面。

参考：

```text
apps/web/src/apps/web/JobCreatePage.tsx
apps/web/src/apps/web/searchFormConfig.ts
```

字段由配置生成：

```ts
const searchConfig = buildSearchConfig(watchedValues);
```

页面遍历字段：

```tsx
{searchConfig.filter(isFieldVisible).map((field) => (
  <Col span={field.span} key={field.name}>
    <Form.Item name={field.name} label={field.label}>
      {renderField(field)}
    </Form.Item>
  </Col>
))}
```

适合：

```text
产品申请流程
字段很多
不同产品字段不同
select 多级联动
```

### 方式二：页面内简单表单

适合新页面 A 只有两个字段。

示例：

```tsx
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Form, Input, Space } from 'antd';

export function PageA() {
  return (
    <PageContainer title="页面A">
      <ProCard title="搜索条件">
        <Form
          layout="inline"
          onFinish={(values) => {
            console.log(values);
          }}
        >
          <Form.Item name="name" label="姓名">
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机">
            <Input placeholder="请输入手机" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">搜索</Button>
            <Button htmlType="reset">重置</Button>
          </Space>
        </Form>
      </ProCard>
    </PageContainer>
  );
}
```

适合：

```text
页面字段固定
只有 1-5 个字段
不需要产品目录联动
```

## 结果区怎么做

### 表格结果

适合多条记录。

参考：

```text
apps/web/src/apps/web/MultiTaskTablePage.tsx
```

使用：

```tsx
<ProTable
  rowKey="id"
  search={false}
  dataSource={data}
  columns={[...]}
/>
```

### 卡片结果

适合截图里那种卡片墙。

参考：

```text
apps/web/src/apps/web/CardSearchPage.tsx
```

使用：

```tsx
<Row gutter={[16, 16]}>
  {cards.map((item) => (
    <Col span={6} key={item.name}>
      <Card>{item.name}</Card>
    </Col>
  ))}
</Row>
```

### 只需要一个结果，不需要详情

如果页面 A 搜索后只返回一个结果，不需要详情抽屉，可以这样做：

```tsx
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Descriptions, Form, Input } from 'antd';
import { useState } from 'react';

export function PageA() {
  const [result, setResult] = useState<any>(null);

  return (
    <PageContainer title="页面A">
      <ProCard title="搜索条件">
        <Form
          layout="inline"
          onFinish={(values) => {
            setResult({
              name: values.name,
              status: '成功',
              message: '这是一个单结果示例',
            });
          }}
        >
          <Form.Item name="name" label="姓名">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit">搜索</Button>
        </Form>
      </ProCard>

      {result && (
        <ProCard title="搜索结果" style={{ marginTop: 16 }}>
          <Descriptions column={1}>
            <Descriptions.Item label="姓名">{result.name}</Descriptions.Item>
            <Descriptions.Item label="状态">{result.status}</Descriptions.Item>
            <Descriptions.Item label="说明">{result.message}</Descriptions.Item>
          </Descriptions>
        </ProCard>
      )}
    </PageContainer>
  );
}
```

这种页面不需要：

```text
Drawer
详情按钮
结果表格
日志列表
```

## 如果新页面字段更多

字段很多时建议新建独立配置文件：

```text
apps/web/src/apps/web/pageAConfig.ts
```

例如：

```ts
export const pageAFields = [
  { name: 'name', label: '姓名', type: 'input', span: 6 },
  { name: 'phone', label: '手机', type: 'input', span: 6 },
  { name: 'status', label: '状态', type: 'select', span: 6, options: [...] },
];
```

然后页面里遍历配置生成表单。不要把几十个字段直接堆在 JSX 里。

## 是否需要详情页

判断方式：

```text
需要查看日志、执行步骤、复杂结果 -> 用 Drawer 详情
只展示一个结果 -> 直接 ProCard + Descriptions
多条结果 -> ProTable
展示对象卡片 -> Card + Row/Col
```

当前已有示例：

| 页面 | 文件 | 结果形式 |
| --- | --- | --- |
| 产品申请 | `JobCreatePage.tsx` | 表格 + Drawer 详情 + 日志 |
| 多维任务表格 | `MultiTaskTablePage.tsx` | 多维表格 |
| 卡片式搜索表单 | `CardSearchPage.tsx` | 卡片列表 |
| 个人中心 | `PersonalCenterPage.tsx` | 历史记录列表 |

## 前端请求规范

接口请求统一写在：

```text
apps/web/src/api/app.ts
```

不要在页面里直接写：

```ts
axios.get(...)
```

推荐：

```ts
// api/app.ts
export async function queryPageA(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/page-a/query/', payload);
  return data;
}
```

页面中：

```ts
const mutation = useMutation({
  mutationFn: queryPageA,
});
```

更多请求说明见：

```text
docs/frontend-api-requests.md
```

## 开发检查

修改前端后建议运行：

```bash
npm run build -w apps/web
```

构建前端时会执行这一步。

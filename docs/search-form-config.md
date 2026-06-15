# 搜索表单配置说明

配置文件：

```text
apps/web/src/apps/web/searchFormConfig.ts
```

页面文件：

```text
apps/web/src/apps/web/JobCreatePage.tsx
```

一般只改配置文件。页面文件负责渲染、提交、结果展示。

## 核心结构

```ts
const environments = [...]
const productCatalog = [...]
const commonFields = [...]
export const cascadeResetMap = {...}
export const searchPageBehavior = {...}
```

| 对象 | 作用 |
| --- | --- |
| `environments` | 环境列表 |
| `productCatalog` | 以产品为单位维护产地、地区、城市、字段规则 |
| `commonFields` | 公共字段，如姓名、证件、手机 |
| `cascadeResetMap` | 上级变化时自动重置哪些下级字段 |
| `searchPageBehavior` | 搜索页面行为配置 |

## 单选 Select

单选下拉这样配：

```ts
{
  name: 'serviceType',
  label: '办理类型',
  type: 'select',
  span: 6,
  editable: true,
  visible: true,
  submit: true,
  required: true,
  defaultValue: 'new',
  options: [
    { label: '新办', value: 'new' },
    { label: '变更', value: 'change' },
  ],
}
```

关键点：

```text
multiple 不写或 multiple: false，就是单选
defaultValue 使用字符串
```

## 一对多候选和多选 Select

这里要区分两个概念：

```text
一对多候选：一个产品可以支持多个环境、多个产地、多个地区、多个城市，但用户每次只选一个。
多选 Select：页面控件允许用户一次勾选多个值，提交给后端的是数组。
```

执行产品申请流程里的层级字段采用“一对多候选 + 单选控件”：

```text
环境：单选
产品：单选
产地：单选
地区：单选
城市：单选
```

例如产品A支持环境1、环境2、环境3，不是页面一次选三个环境，而是三个环境都能在下拉中选到，并且选中任意一个环境时都能继续选择产品A。

真正需要多选控件时才这样配：

```ts
{
  name: 'tags',
  label: '标签',
  type: 'select',
  span: 6,
  editable: true,
  visible: true,
  submit: true,
  multiple: true,
  defaultValue: ['tag_1'],
  options: [
    { label: '标签1', value: 'tag_1' },
    { label: '标签2', value: 'tag_2' },
  ],
}
```

关键点：

```text
multiple: true 表示多选
defaultValue 使用数组
提交给后端时也是数组
```

## Switch

开关这样配：

```ts
{
  name: 'includeArchived',
  label: '包含历史',
  type: 'switch',
  span: 6,
  editable: true,
  visible: true,
  submit: true,
  defaultValue: false,
}
```

关键点：

```text
type: 'switch'
defaultValue 使用 true / false
提交给后端时是 boolean
```

## 产品目录

100 个产品时，主要维护 `productCatalog`，不要在页面里写一堆联动。

一个产品配置：

```ts
{
  id: 'product_a',
  label: '产品A',
  environmentIds: ['env_1'],
  origins: [
    {
      id: 'origin_1',
      label: '产地1',
      regions: [
        {
          id: 'region_1',
          label: '地区1',
          cities: [{ id: 'city_1', label: '城市1' }],
        },
      ],
    },
  ],
  fieldOverrides: {
    personName: { required: true },
  },
  extraFields: [...],
}
```

当前 mock：

```text
环境1
  产品A
    产地1
      地区1 -> 城市1
      地区2 -> 城市2
    姓名必填
    证件必填
    手机必填
    额外字段：办理类型 select

  产品B
    产地2
      地区3 -> 城市3
    姓名非必填
    证件必填
    手机非必填
```

## 公共字段

公共字段在：

```ts
const commonFields: FieldConfig[] = [...]
```

例如姓名、证件、手机。公共字段默认出现在所有产品里。

## 产品覆盖公共字段

不同产品对公共字段要求不同，用 `fieldOverrides`。

产品A姓名必填：

```ts
fieldOverrides: {
  personName: { required: true },
}
```

产品B姓名不必填：

```ts
fieldOverrides: {
  personName: { required: false, placeholder: '产品B姓名非必填' },
}
```

也可以控制是否显示、是否提交、是否可编辑：

```ts
fieldOverrides: {
  personName: {
    visible: false,
    submit: false,
    editable: false,
    span: 12,
  },
}
```

## 产品专属字段

只有某个产品需要的字段，放到该产品的 `extraFields`。

```ts
extraFields: [
  {
    name: 'serviceType',
    label: '办理类型',
    type: 'select',
    span: 6,
    editable: true,
    visible: true,
    submit: true,
    required: true,
    defaultValue: 'new',
    options: [
      { label: '新办', value: 'new' },
      { label: '变更', value: 'change' },
    ],
  },
]
```

产品A写了这个字段，产品B不写，切到产品B时就不会显示，也不会提交。

## 字段配置项

| 配置项 | 说明 |
| --- | --- |
| `name` | 字段名，也是提交给后端时的 key |
| `label` | 页面显示名称 |
| `type` | `input`、`select`、`switch` |
| `span` | 字段宽度，基于 24 栅格 |
| `editable` | 是否可编辑 |
| `visible` | 是否显示 |
| `submit` | 是否提交给后端 |
| `required` | 是否必填 |
| `multiple` | select 是否多选 |
| `placeholder` | 输入提示 |
| `defaultValue` | 默认值 |
| `options` | select 下拉选项 |

宽度：

```text
span: 24  一整行
span: 12  半行
span: 8   一行三个
span: 6   一行四个
```

每一个搜索项都可以单独控制 `span`，包括公共字段、产品专属字段、环境、产品、产地、地区、城市。

例如让姓名更长：

```ts
{
  name: 'personName',
  label: '姓名',
  span: 12,
}
```

## 级联重置

```ts
export const cascadeResetMap = {
  environment: ['product', 'origin', 'region', 'city', 'serviceType'],
  product: ['origin', 'region', 'city', 'serviceType'],
  origin: ['region', 'city'],
  region: ['city'],
};
```

例如产品变化后，会重置：

```text
产地 / 地区 / 城市 / 产品专属字段
```

## 是否读取历史数据

搜索结果默认不读取历史数据：

```ts
export const searchPageBehavior = {
  readHistoryOnOpen: false,
};
```

含义：

```text
false：新打开页面时结果为空，只显示本次页面打开后提交的新搜索
true：新打开页面时读取后端历史任务记录
```

注意：每次点击搜索，后端仍会创建一条任务记录并存入 `jobs_job` 表。  
`readHistoryOnOpen` 只控制前端页面是否在打开时展示历史记录。

## 提交到后端

点击搜索后，只提交：

```text
visible = true
submit = true
当前产品下实际存在
```

数据示例：

```json
{
  "name": "搜索任务",
  "search_form": {
    "environment": ["env_1"],
    "product": ["product_a"],
    "origin": ["origin_1"],
    "region": ["region_1"],
    "city": ["city_1"],
    "personName": "张三",
    "certificateNo": "110101199001011234",
    "phone": "13800000000",
    "includeArchived": false,
    "serviceType": "new"
  },
  "biz_payload": "{...}"
}
```

真实业务接入点：

```text
apps/backend/workflows/registry.py
```

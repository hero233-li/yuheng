export type FieldType = 'input' | 'select' | 'switch';

export interface SelectOption {
  label: string;
  value: string;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  span: number;
  editable: boolean;
  visible: boolean;
  submit: boolean;
  required?: boolean;
  multiple?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: SelectOption[];
  visibleWhen?: {
    field: string;
    value: unknown;
  };
}

interface CityConfig {
  id: string;
  label: string;
}

interface RegionConfig {
  id: string;
  label: string;
  cities: CityConfig[];
}

interface OriginConfig {
  id: string;
  label: string;
  regions: RegionConfig[];
}

interface ProductConfig {
  id: string;
  label: string;
  environmentIds: string[];
  origins: OriginConfig[];
  fieldOverrides?: Record<string, Partial<FieldConfig>>;
  extraFields?: FieldConfig[];
}

const environments: SelectOption[] = [
  { label: '环境1', value: 'env_1' },
  { label: '环境2', value: 'env_2' },
  { label: '环境3', value: 'env_3' },
];

const productCatalog: ProductConfig[] = [
  {
    id: 'product_a',
    label: '产品A',
    environmentIds: ['env_1', 'env_2', 'env_3'],
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
          {
            id: 'region_2',
            label: '地区2',
            cities: [{ id: 'city_2', label: '城市2' }],
          },
        ],
      },
      {
        id: 'origin_3',
        label: '产地3',
        regions: [
          {
            id: 'region_4',
            label: '地区4',
            cities: [
              { id: 'city_4', label: '城市4' },
              { id: 'city_5', label: '城市5' },
            ],
          },
        ],
      },
    ],
    fieldOverrides: {
      personName: { required: true, visible: true, submit: true },
      certificateNo: { required: true },
      phone: { required: true },
    },
    extraFields: [
      {
        name: 'serviceType',
        label: '办理类型',
        type: 'select',
        span: 3,
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
    ],
  },
  {
    id: 'product_b',
    label: '产品B',
    environmentIds: ['env_1', 'env_2'],
    origins: [
      {
        id: 'origin_2',
        label: '产地2',
        regions: [
          {
            id: 'region_3',
            label: '地区3',
            cities: [{ id: 'city_3', label: '城市3' }],
          },
        ],
      },
    ],
    fieldOverrides: {
      personName: { required: false, placeholder: '产品B姓名非必填' },
      certificateNo: { required: true },
      phone: { required: false },
    },
  },
];

const commonFields: FieldConfig[] = [
  {
    name: 'personName',
    label: '姓名',
    type: 'input',
    span: 3,
    editable: true,
    visible: true,
    submit: true,
    placeholder: '请输入姓名',
  },
  {
    name: 'certificateNo',
    label: '证件',
    type: 'input',
    span: 3,
    editable: true,
    visible: true,
    submit: true,
    placeholder: '请输入证件号',
  },
  {
    name: 'phone',
    label: '手机',
    type: 'input',
    span: 3,
    editable: true,
    visible: true,
    submit: true,
    placeholder: '请输入手机号',
  },
  {
    name: 'includeArchived',
    label: '包含历史',
    type: 'switch',
    span: 3,
    editable: true,
    visible: true,
    submit: true,
    defaultValue: false,
  },
];

export const cascadeResetMap: Record<string, string[]> = {
  environment: ['product', 'origin', 'region', 'city', 'serviceType'],
  product: ['origin', 'region', 'city', 'serviceType'],
  origin: ['region', 'city'],
  region: ['city'],
};

export const searchPageBehavior = {
  readHistoryOnOpen: false,
};

export function buildSearchConfig(values: Record<string, unknown> = {}): FieldConfig[] {
  const environmentId = getValidValue(values.environment, environments);
  const productOptions = getProductsByEnvironment(environmentId).map(toOption);
  const productId = getValidValue(values.product, productOptions);
  const product = getProduct(productId);
  const originOptions = uniqueOptions(product.origins.map(toOption));
  const originId = getValidValue(values.origin, originOptions);
  const origin = product.origins.find((item) => item.id === originId) || product.origins[0];
  const regionOptions = uniqueOptions((origin?.regions || []).map(toOption));
  const regionId = getValidValue(values.region, regionOptions);
  const region = origin?.regions.find((item) => item.id === regionId) || origin?.regions[0];
  const cityOptions = uniqueOptions((region?.cities || []).map(toOption));

  const hierarchyFields: FieldConfig[] = [
    {
      name: 'environment',
      label: '环境',
      type: 'select',
      span: 6,
      editable: true,
      visible: true,
      submit: true,
      required: true,
      defaultValue: environments[0]?.value,
      options: environments,
    },
    {
      name: 'product',
      label: '产品',
      type: 'select',
      span: 6,
      editable: true,
      visible: true,
      submit: true,
      required: true,
      defaultValue: productOptions[0]?.value,
      options: productOptions,
    },
    {
      name: 'origin',
      label: '产地',
      type: 'select',
      span: 6,
      editable: true,
      visible: true,
      submit: true,
      required: true,
      defaultValue: originOptions[0]?.value,
      options: originOptions,
    },
    {
      name: 'region',
      label: '地区',
      type: 'select',
      span: 6,
      editable: true,
      visible: true,
      submit: true,
      required: true,
      defaultValue: regionOptions[0]?.value,
      options: regionOptions,
    },
    {
      name: 'city',
      label: '城市',
      type: 'select',
      span: 6,
      editable: true,
      visible: true,
      submit: true,
      required: true,
      defaultValue: cityOptions[0]?.value,
      options: cityOptions,
    },
  ];

  const commonWithProductRules = commonFields.map((field) => ({
    ...field,
    ...(product.fieldOverrides?.[field.name] || {}),
  }));

  return [
    ...hierarchyFields,
    ...commonWithProductRules,
    ...(product.extraFields || []),
  ];
}

export function getInitialSearchValues() {
  const config = buildSearchConfig();
  return Object.fromEntries(
    config
      .filter((field) => field.defaultValue !== undefined)
      .map((field) => [field.name, field.defaultValue]),
  );
}

function getProductsByEnvironment(environmentId: string) {
  const products = productCatalog.filter((product) =>
    product.environmentIds.includes(environmentId),
  );
  return products.length > 0 ? products : [productCatalog[0]];
}

function getProduct(productId: string) {
  return productCatalog.find((product) => product.id === productId) || productCatalog[0];
}

function getValidValue(value: unknown, options: SelectOption[]) {
  const optionValues = new Set(options.map((option) => option.value));
  if (typeof value === 'string' && optionValues.has(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    const firstValidValue = value.find((item): item is string => typeof item === 'string' && optionValues.has(item));
    if (firstValidValue) {
      return firstValidValue;
    }
  }
  return options[0]?.value || '';
}

function toOption(item: { id: string; label: string }) {
  return {
    label: item.label,
    value: item.id,
  };
}

function uniqueOptions(options: SelectOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.value)) {
      return false;
    }
    seen.add(option.value);
    return true;
  });
}

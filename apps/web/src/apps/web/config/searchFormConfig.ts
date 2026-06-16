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
  searchable?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: SelectOption[];
  checkedLabel?: string;
  uncheckedLabel?: string;
  switchWidth?: number | string;
  visibleWhen?: {
    field: string;
    value: unknown;
  };
}

interface OutletConfig {
  id: string;
  label: string;
}

interface JurisdictionConfig {
  id: string;
  label: string;
  outlets: OutletConfig[];
}

interface LocationConfig {
  id: string;
  label: string;
  jurisdictions: JurisdictionConfig[];
}

interface ProductConfig {
  id: string;
  label: string;
  environmentIds: string[];
  locations: LocationConfig[];
  fieldOverrides?: Record<string, Partial<FieldConfig>>;
  extraFields?: FieldConfig[];
}

const environments: SelectOption[] = [
  { label: 'UAT1', value: 'UAT1' },
  { label: 'UAT2', value: 'UAT2' },
  { label: 'UATC', value: 'UATC' },
];

const productCatalog: ProductConfig[] = [
  {
    id: '交银人才贷',
    label: '交银人才贷',
    environmentIds: ['UAT1', 'UAT2', 'UATC'],
    locations: [
      {
        id: '广东省汕头市',
        label: '广东省汕头市',
        jurisdictions: [
          {
            id: '汕头分行',
            label: '汕头分行',
             outlets: [
              { id: '汕头分行营业部', label: '汕头分行营业部' },
              { id: '汕头第二支行', label: '汕头第二支行' },
            ],
          },
          {
            id: 'jurisdiction_2',
            label: '汕头分行2',
            outlets: [{ id: 'outlet_2', label: '汕头支行' }],
          },
        ],
      },
      {
        id: 'location_3',
        label: '湖南省长沙市',
        jurisdictions: [
          {
            id: 'jurisdiction_4',
            label: '辖行4',
            outlets: [
              { id: 'outlet_4', label: '网点4' },
              { id: 'outlet_5', label: '网点5' },
            ],
          },
        ],
      },
    ],
    fieldOverrides: {
      personName: { required: true, visible: true, submit: true },
      certificateNo: { required: true },
      phone: { required: true },
      cardNo: { required: true },
      companyName: { required: true },
      creditCode: { required: true },
    },
  },
  {
    id: 'product_b',
    label: '产品B',
    environmentIds: ['UAT1', 'UAT2'],
    locations: [
      {
        id: 'location_2',
        label: '所在地2',
        jurisdictions: [
          {
            id: 'jurisdiction_3',
            label: '辖行3',
            outlets: [{ id: 'outlet_3', label: '网点3' }],
          },
        ],
      },
    ],
    fieldOverrides: {
      personName: { required: false, placeholder: '产品B姓名非必填' },
      certificateNo: { required: true },
      phone: { required: false },
      // companyName: { required: true },
      // creditCode: { required: true },
    },
  },
];

const commonFields: FieldConfig[] = [
  {
    name: 'personName',
    label: '姓名',
    type: 'input',
    span: 4,
    editable: true,
    visible: true,
    submit: true,
    placeholder: '请输入姓名',
  },
  {
    name: 'certificateNo',
    label: '证件号',
    type: 'input',
    span: 4,
    editable: true,
    visible: true,
    submit: true,
    placeholder: '请输入证件号',
  },
  {
    name: 'phone',
    label: '手机号',
    type: 'input',
    span: 4,
    editable: true,
    visible: true,
    submit: true,
    placeholder: '请输入手机号',
  },
  {
    name: 'cardNo',
    label: '卡号',
    type: 'input',
    span: 4,
    editable: true,
    visible: true,
    submit: true,
    placeholder: '请输入卡号',
  },
  {
    name: 'companyName',
    label: '公司名',
    type: 'input',
    span: 4,
    editable: true,
    visible: true,
    submit: true,
    placeholder: '请输入公司名',
  },
  {
    name: 'creditCode',
    label: '信用代码',
    type: 'input',
    span: 4,
    editable: true,
    visible: true,
    submit: true,
    placeholder: '请输入信用代码',
  },
  {
    name: 'whitelist',
    label: '白名单',
    type: 'switch',
    span: 2,
    editable: true,
    visible: true,
    submit: true,
    defaultValue: true,
    checkedLabel: '',
    uncheckedLabel: '',
  },
  {
    name: 'redShield',
    label: '红盾',
    type: 'switch',
    span: 2,
    editable: true,
    visible: true,
    submit: true,
    defaultValue: false,
    checkedLabel: '',
    uncheckedLabel: '',
  },
  {
    name: 'creditReport',
    label: '征信',
    type: 'switch',
    span: 2,
    editable: true,
    visible: true,
    submit: true,
    defaultValue: true,
    checkedLabel: '',
    uncheckedLabel: '',
  },
  {
    name: 'legalPerson',
    label: '法人',
    type: 'switch',
    span: 6,
    editable: true,
    visible: true,
    submit: true,
    defaultValue: true,
    switchWidth:44,
    checkedLabel: '法人',
    uncheckedLabel: '股东',
  },
];

export const cascadeResetMap: Record<string, string[]> = {
  environment: ['product', 'location', 'jurisdiction', 'outlet'],
  product: ['location', 'jurisdiction', 'outlet'],
  location: ['jurisdiction', 'outlet'],
  jurisdiction: ['outlet'],
  companyName: ['legalPerson'],
};

export const searchPageBehavior = {
  readHistoryOnOpen: false,
};

export function buildSearchConfig(values: Record<string, unknown> = {}): FieldConfig[] {
  const environmentId = getValidValue(values.environment, environments);
  const productOptions = getProductsByEnvironment(environmentId).map(toOption);
  const productId = getValidValue(values.product, productOptions);
  const product = getProduct(productId);
  const locationOptions = uniqueOptions(product.locations.map(toOption));
  const locationId = getValidValue(values.location, locationOptions);
  const location = product.locations.find((item) => item.id === locationId) || product.locations[0];
  const jurisdictionOptions = uniqueOptions((location?.jurisdictions || []).map(toOption));
  const jurisdictionId = getValidValue(values.jurisdiction, jurisdictionOptions);
  const jurisdiction = location?.jurisdictions.find((item) => item.id === jurisdictionId) || location?.jurisdictions[0];
  const outletOptions = uniqueOptions((jurisdiction?.outlets || []).map(toOption));

  const hierarchyFields: FieldConfig[] = [
    {
      name: 'environment',
      label: '环境',
      type: 'select',
      span: 3,
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
      searchable: true,
      placeholder: '输入产品名称搜索',
      defaultValue: productOptions[0]?.value,
      options: productOptions,
    },
    {
      name: 'location',
      label: '客户所在地',
      type: 'select',
      span: 5,
      editable: true,
      visible: true,
      submit: true,
      required: true,
      defaultValue: locationOptions[0]?.value,
      options: locationOptions,
    },
    {
      name: 'jurisdiction',
      label: '辖行名称',
      type: 'select',
      span: 5,
      editable: true,
      visible: true,
      submit: true,
      required: true,
      defaultValue: jurisdictionOptions[0]?.value,
      options: jurisdictionOptions,
    },
    {
      name: 'outlet',
      label: '网点名称',
      type: 'select',
      span: 5,
      editable: true,
      visible: true,
      submit: true,
      required: true,
      defaultValue: outletOptions[0]?.value,
      options: outletOptions,
    },
  ];

  const commonWithProductRules = commonFields.map((field) => applyDynamicFieldRules(
    {
      ...field,
      ...(product.fieldOverrides?.[field.name] || {}),
    },
    values,
  ));

  return [
    ...hierarchyFields,
    ...commonWithProductRules,
    ...(product.extraFields || []),
  ];
}

function applyDynamicFieldRules(field: FieldConfig, values: Record<string, unknown>): FieldConfig {
  if (field.name !== 'legalPerson') {
    return field;
  }
  const hasCompanyName = String(values.companyName || '').trim().length > 0;
  if (hasCompanyName) {
    return {
      ...field,
      editable: true,
      checkedLabel: '法人',
      uncheckedLabel: '股东',
    };
  }
  return {
    ...field,
    editable: false,
    defaultValue: false,
    checkedLabel: '不维护，上送为农户',
    uncheckedLabel: '不维护，上送为农户',
  };
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

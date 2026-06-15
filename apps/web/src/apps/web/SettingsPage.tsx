import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, ColorPicker, Descriptions, Radio, Space, Tabs, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useAppPreferences } from '../../stores/appPreferences';

const menuSettings = [
  { path: '/product-apply', label: '产品申请' },
  { path: '/search-form-2', label: '数据维护' },
  { path: '/reset-password', label: '重置密码' },
  { path: '/multi-task-table', label: '多维任务表格' },
  { path: '/card-search', label: '卡片式搜索表单' },
  { path: '/grouped-card-search', label: '分组卡片搜索表单' },
  { path: '/menu-three/overview', label: '菜单三页面' },
  { path: '/personal-center', label: '个人中心' },
  { path: '/system-settings', label: '系统设置' },
];

export function SettingsPage() {
  const {
    themeMode,
    primaryColor,
    layoutDensity,
    contentWidth,
    contentPadding,
    pageGap,
    fontSize,
    borderRadius,
    headerHeight,
    siderWidth,
    tableSize,
    cardShadow,
    menuTabModes,
    setThemeMode,
    setPrimaryColor,
    setLayoutDensity,
    setContentWidth,
    setContentPadding,
    setPageGap,
    setFontSize,
    setBorderRadius,
    setHeaderHeight,
    setSiderWidth,
    setTableSize,
    setCardShadow,
  } = useAppPreferences();

  return (
    <PageContainer title="系统设置">
      <Tabs
        items={[
          {
            key: 'appearance',
            label: '外观设置',
            children: (
              <ProCard title="外观设置" className="settings-panel">
                <div className="setting-grid">
                  <SettingItem label="主题" value={themeMode === 'light' ? '浅色' : '深色'}>
                    <Radio.Group value={themeMode} onChange={(event) => setThemeMode(event.target.value)}>
                      <Radio.Button value="light">浅色</Radio.Button>
                      <Radio.Button value="dark">深色</Radio.Button>
                    </Radio.Group>
                  </SettingItem>
                  <SettingItem label="主色" value={primaryColor.toUpperCase()}>
                    <ColorPicker
                      value={primaryColor}
                      showText
                      onChangeComplete={(color) => setPrimaryColor(color.toHexString())}
                    />
                  </SettingItem>
                  <SettingItem label="页面密度" value={layoutDensity === 'comfortable' ? '舒适' : '紧凑'}>
                    <Radio.Group value={layoutDensity} onChange={(event) => setLayoutDensity(event.target.value)}>
                      <Radio.Button value="comfortable">舒适</Radio.Button>
                      <Radio.Button value="compact">紧凑</Radio.Button>
                    </Radio.Group>
                  </SettingItem>
                  <SettingItem label="内容宽度" value={`${contentWidth}%`}>
                    <StepperControl
                      value={contentWidth}
                      min={70}
                      max={100}
                      step={5}
                      suffix="%"
                      onChange={setContentWidth}
                    />
                  </SettingItem>
                  <SettingItem label="顶栏高度" value={`${headerHeight}px`}>
                    <StepperControl
                      value={headerHeight}
                      min={56}
                      max={96}
                      step={4}
                      suffix="px"
                      onChange={setHeaderHeight}
                    />
                  </SettingItem>
                  <SettingItem label="页面边距" value={`${contentPadding}px`}>
                    <StepperControl
                      value={contentPadding}
                      min={8}
                      max={32}
                      step={2}
                      suffix="px"
                      onChange={setContentPadding}
                    />
                  </SettingItem>
                  <SettingItem label="卡片间距" value={`${pageGap}px`}>
                    <StepperControl
                      value={pageGap}
                      min={8}
                      max={32}
                      step={2}
                      suffix="px"
                      onChange={setPageGap}
                    />
                  </SettingItem>
                  <SettingItem label="基础字号" value={`${fontSize}px`}>
                    <StepperControl
                      value={fontSize}
                      min={12}
                      max={18}
                      step={1}
                      suffix="px"
                      onChange={setFontSize}
                    />
                  </SettingItem>
                  <SettingItem label="圆角大小" value={`${borderRadius}px`}>
                    <StepperControl
                      value={borderRadius}
                      min={2}
                      max={12}
                      step={1}
                      suffix="px"
                      onChange={setBorderRadius}
                    />
                  </SettingItem>
                  <SettingItem label="侧栏宽度" value={`${siderWidth}px`}>
                    <StepperControl
                      value={siderWidth}
                      min={200}
                      max={280}
                      step={10}
                      suffix="px"
                      onChange={setSiderWidth}
                    />
                  </SettingItem>
                  <SettingItem label="卡片阴影" value={cardShadow === 'none' ? '无' : cardShadow === 'light' ? '轻微' : '明显'}>
                    <Radio.Group value={cardShadow} onChange={(event) => setCardShadow(event.target.value)}>
                      <Radio.Button value="none">无</Radio.Button>
                      <Radio.Button value="light">轻微</Radio.Button>
                      <Radio.Button value="strong">明显</Radio.Button>
                    </Radio.Group>
                  </SettingItem>
                  <SettingItem label="表格尺寸" value={tableSize === 'small' ? '紧凑' : tableSize === 'middle' ? '标准' : '宽松'}>
                    <Radio.Group value={tableSize} onChange={(event) => setTableSize(event.target.value)}>
                      <Radio.Button value="small">紧凑</Radio.Button>
                      <Radio.Button value="middle">标准</Radio.Button>
                      <Radio.Button value="large">宽松</Radio.Button>
                    </Radio.Group>
                  </SettingItem>
                </div>
              </ProCard>
            ),
          },
          {
            key: 'menu',
            label: '菜单管理',
            children: (
              <ProCard title="菜单管理">
                <Typography.Paragraph type="secondary">
                  当前页面只展示菜单页签模式，具体是否可多开请在 React 配置中维护。
                </Typography.Paragraph>
                <Descriptions column={1} bordered size="small">
                  {menuSettings.map((item) => (
                    <Descriptions.Item label={item.label} key={item.path}>
                      <Space>
                        <Tag color={menuTabModes[item.path] === 'multi' ? 'purple' : 'blue'}>
                          {menuTabModes[item.path] === 'multi' ? '允许多开' : '复用页签'}
                        </Tag>
                        <Typography.Text type="secondary">{item.path}</Typography.Text>
                      </Space>
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </ProCard>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}

function SettingItem({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="setting-item">
      <Typography.Text className="setting-label">{label}</Typography.Text>
      <div className="setting-control">{children}</div>
      <Typography.Text className="setting-value">{value}</Typography.Text>
    </div>
  );
}

function StepperControl({
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const decrease = () => onChange(Math.max(min, value - step));
  const increase = () => onChange(Math.min(max, value + step));

  return (
    <Space.Compact>
      <Button disabled={value <= min} onClick={decrease}>-</Button>
      <Button className="stepper-value">{value}{suffix}</Button>
      <Button disabled={value >= max} onClick={increase}>+</Button>
    </Space.Compact>
  );
}

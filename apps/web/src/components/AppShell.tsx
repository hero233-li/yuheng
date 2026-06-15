import {
  AppstoreOutlined,
  BarsOutlined,
  MenuFoldOutlined,
  HistoryOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  PlayCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Breadcrumb, Button, ConfigProvider, Layout, Menu, Tabs, Tag, Typography, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useAppPreferences } from '../stores/appPreferences';

const { Header, Sider, Content } = Layout;

interface AppMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children?: AppMenuItem[];
}

const menuItems: AppMenuItem[] = [
  {
    key: 'group-one',
    icon: <AppstoreOutlined />,
    label: '一级菜单一',
    children: [
      { key: '/product-apply', icon: <PlayCircleOutlined />, label: '产品申请' },
      { key: '/search-form-2', icon: <PlayCircleOutlined />, label: '数据维护' },
      { key: '/reset-password', icon: <PlayCircleOutlined />, label: '重置密码' },
    ],
  },
  {
    key: 'group-two',
    icon: <MenuOutlined />,
    label: '一级菜单二',
    children: [
      { key: '/card-search', icon: <AppstoreOutlined />, label: '卡片式搜索表单' },
      { key: '/grouped-card-search', icon: <AppstoreOutlined />, label: '分组卡片搜索表单' },
    ],
  },
  {
    key: 'group-three',
    icon: <SettingOutlined />,
    label: '一级菜单三',
    children: [
      { key: '/multi-task-table', icon: <BarsOutlined />, label: '多维任务表格' },
      { key: '/menu-three/overview', label: '菜单三页面' },
      { key: '/personal-center', icon: <HistoryOutlined />, label: '个人中心' },
      { key: '/system-settings', icon: <SettingOutlined />, label: '系统设置' },
    ],
  },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const title = '内网自动化工具';
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
    siderCollapsed,
    cardShadow,
    menuTabModes,
    setSiderCollapsed,
  } = useAppPreferences();
  const [tabs, setTabs] = useState<Array<{ key: string; path: string; label: string }>>([]);
  const [activeTabKey, setActiveTabKey] = useState('');
  const flatMenuItems = useMemo(() => flattenMenu(menuItems), [menuItems]);
  const currentMenu = flatMenuItems.find((item) => item.key === location.pathname);
  const breadcrumbItems = useMemo(() => buildBreadcrumb(menuItems, location.pathname), [location.pathname, menuItems]);
  const selectedKeys = currentMenu ? [currentMenu.key] : [location.pathname];

  useEffect(() => {
    if (!currentMenu) {
      return;
    }
    const activeTab = tabs.find((item) => item.key === activeTabKey);
    if (activeTab?.path === currentMenu.key) {
      return;
    }
    setTabs((current) => {
      const existing = current.find((item) => item.path === currentMenu.key);
      if (existing) {
        setActiveTabKey(existing.key);
        return current;
      }
      const nextTab = { key: currentMenu.key, path: currentMenu.key, label: currentMenu.label };
      setActiveTabKey(nextTab.key);
      return [...current, nextTab];
    });
  }, [activeTabKey, currentMenu, tabs]);

  function openMenu(path: string) {
    const target = flatMenuItems.find((item) => item.key === path);
    if (!target) {
      return;
    }
    if ((menuTabModes[path] || 'single') === 'multi') {
      const samePathCount = tabs.filter((item) => item.path === path).length;
      const tabKey = `${path}::${Date.now()}`;
      const nextTab = {
        key: tabKey,
        path,
        label: samePathCount === 0 ? target.label : `${target.label}-${samePathCount + 1}`,
      };
      setTabs((current) => [...current, nextTab]);
      setActiveTabKey(tabKey);
    }
    navigate(path);
  }

  const antdMenuItems = toAntdMenuItems(menuItems);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: primaryColor, fontSize, borderRadius },
        components: {
          Layout: { bodyBg: themeMode === 'dark' ? '#101418' : '#f5f7fb' },
        },
      }}
    >
      <Layout className={`app-layout app-card-shadow-${cardShadow}`}>
        <Sider
          width={siderWidth}
          collapsed={siderCollapsed}
          collapsible
          trigger={null}
          className="app-sider"
        >
          <div className="brand">
            <AppstoreOutlined />
            {!siderCollapsed && <span>{title}</span>}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            defaultOpenKeys={['group-one', 'group-two', 'group-three']}
            selectedKeys={selectedKeys}
            items={antdMenuItems}
            onClick={({ key }) => openMenu(String(key))}
          />
        </Sider>
        <Layout className="app-main-layout">
          <Header className="app-header" style={{ minHeight: headerHeight }}>
            <div className="app-header-left">
              <Button
                type="text"
                icon={siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setSiderCollapsed(!siderCollapsed)}
              />
              <div className="app-header-main">
                <div className="app-header-title">
                  <Breadcrumb items={breadcrumbItems.map((label) => ({ title: label }))} />
                </div>
                <Typography.Text type="secondary" className="app-header-subtitle">
                  本机独立执行任务，数据保存在本机
                </Typography.Text>
              </div>
            </div>
            <Tag color="blue">本地网络版</Tag>
          </Header>
          {tabs.length > 0 && (
            <div className="app-tabs">
              <Tabs
                type="editable-card"
                hideAdd
                activeKey={activeTabKey}
                items={tabs.map((item) => ({ key: item.key, label: item.label }))}
                onChange={(key) => {
                  const tab = tabs.find((item) => item.key === key);
                  if (tab) {
                    setActiveTabKey(key);
                    navigate(tab.path);
                  }
                }}
                onEdit={(targetKey, action) => {
                  if (action !== 'remove') {
                    return;
                  }
                  setTabs((current) => {
                    const next = current.filter((item) => item.key !== targetKey);
                    if (activeTabKey === targetKey) {
                      const fallback = next[next.length - 1];
                      if (fallback) {
                        setActiveTabKey(fallback.key);
                        navigate(fallback.path);
                      }
                    }
                    return next;
                  });
                }}
              />
            </div>
          )}
          <Content
            className={`app-content app-content-${layoutDensity}`}
            style={{
              maxWidth: `${contentWidth}%`,
              padding: contentPadding,
              '--page-gap': `${pageGap}px`,
            } as React.CSSProperties}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

function flattenMenu(items: AppMenuItem[]): AppMenuItem[] {
  return items.flatMap((item) => (item.children ? flattenMenu(item.children) : [item]));
}

function toAntdMenuItems(items: AppMenuItem[]): MenuProps['items'] {
  return items.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    children: item.children ? toAntdMenuItems(item.children) : undefined,
  }));
}

function buildBreadcrumb(items: AppMenuItem[], path: string, parents: string[] = []): string[] {
  for (const item of items) {
    const nextParents = [...parents, item.label];
    if (item.key === path) {
      return nextParents;
    }
    if (item.children) {
      const child = buildBreadcrumb(item.children, path, nextParents);
      if (child.length > 0) {
        return child;
      }
    }
  }
  return [];
}

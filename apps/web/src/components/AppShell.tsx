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
import { App, Breadcrumb, Button, ConfigProvider, Input, Layout, Menu, Modal, Tabs, Tag, Typography, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useAppPreferences } from '../stores/appPreferences';
import { recordInvocation } from '../api/app';

const { Header, Sider, Content } = Layout;
const PERSONAL_CENTER_ACCESS_CODE = 'yu123';

const protectedMenuPaths = new Set(['/multi-task-table', '/personal-center', '/system-settings']);

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
    label: '经营贷全流程',
    children: [
      { key: '/product-apply', icon: <PlayCircleOutlined />, label: '产品申请' },
      { key: '/grouped-card-search', icon: <AppstoreOutlined />, label: '核实审批' },
    ],
  },
  {
    key: 'group-two',
    icon: <MenuOutlined />,
    label: '数据维护',
    children: [
        { key: '/search-form-2', icon: <PlayCircleOutlined />, label: '数据维护' },
        { key: '/reset-password', icon: <PlayCircleOutlined />, label: '重置密码' },
        { key: '/business-password', icon: <PlayCircleOutlined />, label: '业务准入查询' },
    ],
  },
  {
    key: 'group-four',
    icon: <MenuOutlined />,
    label: '高频交易',
    children: [
        { key: 'risk', icon: <PlayCircleOutlined />, label: 'RISK高频' , children: [
              { key: '/risk-050009', icon: <PlayCircleOutlined />, label: 'RISK050009' },
          ] },

    ],
  },
  {
    key: 'group-three',
    icon: <SettingOutlined />,
    label: '个人中心',
    children: [
      { key: '/multi-task-table', icon: <BarsOutlined />, label: '多维任务表格' },
      { key: '/personal-center', icon: <HistoryOutlined />, label: '日志中心' },
      { key: '/system-settings', icon: <SettingOutlined />, label: '系统设置' },
    ],
  },
];

export function AppShell() {
  const location = useLocation();
  const currentFullPath = `${location.pathname}${location.search}`;
  const navigate = useNavigate();
  const { message } = App.useApp();
  const title = '玉衡';
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
  const [personalCenterUnlocked, setPersonalCenterUnlocked] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [pendingProtectedPath, setPendingProtectedPath] = useState<string | null>(null);
  const flatMenuItems = useMemo(() => flattenMenu(menuItems), [menuItems]);
  const currentMenu = flatMenuItems.find((item) => item.key === location.pathname);
  const breadcrumbItems = useMemo(() => buildBreadcrumb(menuItems, location.pathname), [location.pathname, menuItems]);
  const selectedKeys = currentMenu ? [currentMenu.key] : [location.pathname];

  useEffect(() => {
  if (!currentMenu) {
    return;
  }

  const activeTab = tabs.find((item) => item.key === activeTabKey);
  if (activeTab?.path === currentFullPath) {
    return;
  }

  setTabs((current) => {
    const existing = current.find((item) => item.path === currentFullPath);

    if (existing) {
      setActiveTabKey(existing.key);
      return current;
    }

    const searchParams = new URLSearchParams(location.search);
    const tabKeyFromUrl = searchParams.get('tabKey');

    const nextTab = {
      key: tabKeyFromUrl || currentMenu.key,
      path: currentFullPath,
      label: currentMenu.label,
    };

    setActiveTabKey(nextTab.key);
    return [...current, nextTab];
  });
}, [activeTabKey, currentFullPath, currentMenu, location.search, tabs]);

  useEffect(() => {
    if (!currentMenu) {
      return;
    }
    recordInvocation({
      record_type: 'menu',
      name: currentMenu.label,
      path: currentMenu.key,
      detail: '菜单访问',
    }).catch(() => undefined);
  }, [currentMenu]);

  function openMenu(path: string) {
    const target = flatMenuItems.find((item) => item.key === path);
    if (!target) {
      return;
    }
    if (protectedMenuPaths.has(path) && !personalCenterUnlocked) {
      setPendingProtectedPath(path);
      setAccessCode('');
      setAccessModalOpen(true);
      return;
    }
    openAllowedMenu(path, target);
  }
  function openAllowedMenu(path: string, target: AppMenuItem) {
  const mode = menuTabModes[path] || 'single';

  if (mode === 'multi') {
    const samePathCount = tabs.filter((item) => item.path.startsWith(path)).length;
    const tabKey = `${path}::${Date.now()}::${Math.random().toString(36).slice(2)}`;
    const pagePath = `${path}?tabKey=${encodeURIComponent(tabKey)}`;

    const nextTab = {
      key: tabKey,
      path: pagePath,
      label: samePathCount === 0 ? target.label : `${target.label}-${samePathCount + 1}`,
    };

    setTabs((current) => [...current, nextTab]);
    setActiveTabKey(tabKey);
    navigate(pagePath);
    return;
  }

  const existingTab = tabs.find((item) => item.key === path);

  if (existingTab) {
    setActiveTabKey(existingTab.key);
    navigate(existingTab.path);
    return;
  }

  const nextTab = {
    key: path,
    path,
    label: target.label,
  };

  setTabs((current) => [...current, nextTab]);
  setActiveTabKey(path);
  navigate(path);
}
  function verifyAccessCode() {
    if (accessCode !== PERSONAL_CENTER_ACCESS_CODE) {
      message.error('校验码不正确');
      return;
    }
    const target = pendingProtectedPath ? flatMenuItems.find((item) => item.key === pendingProtectedPath) : undefined;
    setPersonalCenterUnlocked(true);
    setAccessModalOpen(false);
    setAccessCode('');
    setPendingProtectedPath(null);
    if (target && pendingProtectedPath) {
      openAllowedMenu(pendingProtectedPath, target);
    }
  }

  const antdMenuItems = toAntdMenuItems(menuItems);

  return (
    <ConfigProvider componentSize="large"
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
            defaultOpenKeys={['group-one', 'group-two',]}
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
                  自动化流程管理与任务执行
                </Typography.Text>
              </div>
            </div>
            <Tag color="blue">Web 版</Tag>
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
            <Outlet key={activeTabKey || currentFullPath} />
          </Content>
        </Layout>
      </Layout>
      <Modal
        title="请输入校验码"
        open={accessModalOpen}
        okText="确认"
        cancelText="取消"
        onOk={verifyAccessCode}
        onCancel={() => {
          setAccessModalOpen(false);
          setAccessCode('');
          setPendingProtectedPath(null);
        }}
      >
        <Input.Password
          autoFocus
          placeholder="请输入校验码"
          value={accessCode}
          onChange={(event) => setAccessCode(event.target.value)}
          onPressEnter={verifyAccessCode}
        />
      </Modal>
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

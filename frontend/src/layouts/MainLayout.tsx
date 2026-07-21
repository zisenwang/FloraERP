import { useState } from 'react'
import { Menu, Dropdown } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import menuItems from '@/config/menuItems'
import { useAuth } from '@/store/AuthContext'
import { useSettings } from '@/store/SettingsContext'
import styles from './MainLayout.module.css'

const SIDEBAR_WIDTH = 220
const SIDEBAR_COLLAPSED_WIDTH = 64

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { settings } = useSettings()
  const isAdmin = user?.role === 'admin'

  type MenuItem = Required<import('antd').MenuProps>['items'][number] & { adminOnly?: boolean; permission?: string; children?: MenuItem[] }

  const permissions: string[] = user?.permissions ?? []

  function canAccess(item: MenuItem): boolean {
    if (isAdmin) return true
    if (item.adminOnly) return false
    if (item.permission) return permissions.includes(item.permission)
    return true
  }

  function filterMenu(items: MenuItem[]): MenuItem[] {
    return items
      .filter(item => canAccess(item as MenuItem))
      .map(item => {
        const children = (item as MenuItem).children
        if (!children) return item
        const filtered = filterMenu(children)
        return { ...item, children: filtered }
      })
      .filter(item => {
        const children = (item as MenuItem).children
        return !children || children.length > 0
      })
  }

  const openKey = location.pathname.split('/')[1] || 'sales'

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: logout,
      },
    ],
  }

  return (
    <div className={styles.root}>
      {/* Top navbar */}
      <header className={styles.topbar}>
        <span className={styles.brand}>{settings.company_name} ERP</span>
        <Dropdown menu={userMenu} placement="bottomRight">
          <span className={styles.userInfo}>
            <UserOutlined style={{ marginRight: 6 }} />
            {user?.name ?? '用户'}
          </span>
        </Dropdown>
      </header>

      {/* Body */}
      <div className={styles.body}>
        {/* Sidebar */}
        <nav
          className={styles.sidebar}
          style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
        >
          <Menu
            mode="inline"
            inlineCollapsed={collapsed}
            selectedKeys={[location.pathname]}
            defaultOpenKeys={[openKey]}
            items={filterMenu(menuItems as MenuItem[])}
            onClick={({ key }) => navigate(key)}
            style={{ border: 'none', flex: 1 }}
          />

          {/* Collapse button at the bottom of the sidebar */}
          <div className={styles.collapseBtnWrapper} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            {!collapsed && <span style={{ marginLeft: 8, fontSize: 13 }}>隐藏菜单</span>}
          </div>
        </nav>

        {/* Main content */}
        <main className={styles.content}>
          <div className={styles.contentInner}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

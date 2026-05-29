import { useState } from 'react'
import { Menu, Button } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import menuItems from '@/config/menuItems'
import styles from './MainLayout.module.css'

const SIDEBAR_WIDTH = 220
const SIDEBAR_COLLAPSED_WIDTH = 64

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const openKey = location.pathname.split('/')[1] || 'sales'

  return (
    <div className={styles.root}>
      {/* Top navbar */}
      <header className={styles.topbar}>
        <span className={styles.brand}>广阔园艺 ERP</span>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{ marginRight: 16 }}
        />
        <span className={styles.topbarRight}>花卉管理系统</span>
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
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ border: 'none', flex: 1 }}
          />
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

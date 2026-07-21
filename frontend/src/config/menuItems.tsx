import {
  HomeOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
  AppstoreOutlined,
  DownloadOutlined,
  UploadOutlined,
  DatabaseOutlined,
  WarningOutlined,
  BarChartOutlined,
  WalletOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'

type MenuItem = Required<MenuProps>['items'][number] & { adminOnly?: boolean; permission?: string; children?: MenuItem[] }

const menuItems: MenuItem[] = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: '首页',
  },
  {
    key: 'master',
    icon: <AppstoreOutlined />,
    label: '基础资料',
    children: [
      { key: '/master/customers', label: '客户管理', icon: <UserOutlined /> },
      { key: '/master/suppliers', label: '供应商管理', icon: <ShopOutlined /> },
      { key: '/master/products', label: '货品管理', icon: <TeamOutlined /> },
    ],
  },
  {
    key: 'purchase',
    icon: <DownloadOutlined />,
    label: '采购管理',
    children: [
      { key: '/purchase/orders', label: '采购单据' },
      { key: '/purchase/orders/new', label: '采购入库' },
      { key: '/purchase/returns/new', label: '采购退货' },
    ],
  },
  {
    key: 'sales',
    icon: <UploadOutlined />,
    label: '销售管理',
    children: [
      { key: '/sales/orders', label: '销售单据' },
      { key: '/sales/orders/new', label: '销售开单' },
      { key: '/sales/returns/new', label: '销售退货' },
    ],
  },
  {
    key: 'inventory',
    icon: <DatabaseOutlined />,
    label: '库存管理',
    children: [
      { key: '/inventory', label: '产品库存' },
      { key: '/inventory/adjust', label: '库存调整', permission: 'inventory_adjust' },
      { key: '/inventory/check', label: '库存盘点', permission: 'inventory_check' },
    ],
  },
  {
    key: 'loss',
    icon: <WarningOutlined />,
    label: '报损管理',
    permission: 'loss',
    children: [
      { key: '/loss', label: '报损记录' },
      { key: '/loss/new', label: '新增报损' },
    ],
  },
  {
    key: 'reports',
    icon: <BarChartOutlined />,
    label: '报表中心',
    children: [
      { key: '/reports/sales', label: '销售报表' },
      { key: '/reports/purchase', label: '采购报表' },
      { key: '/reports/inventory', label: '库存报表' },
      { key: '/reports/rankings', label: '排行榜' },
    ],
  },
  {
    key: '/payment',
    icon: <WalletOutlined />,
    label: '收支管理',
    permission: 'payment',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
    adminOnly: true,
  },
]

export default menuItems

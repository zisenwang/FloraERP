import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import Login from '@/pages/login/Login'
import Dashboard from '@/pages/dashboard/Dashboard'

// 基础资料
import SupplierList from '@/pages/master/SupplierList'
import CustomerList from '@/pages/master/CustomerList'
import ProductList from '@/pages/master/ProductList'

// 采购管理
import PurchaseOrderList from '@/pages/purchase/PurchaseOrderList'
import PurchaseOrderNew from '@/pages/purchase/PurchaseOrderNew'
import PurchaseOrderView from '@/pages/purchase/PurchaseOrderView'
import PurchaseReturnList from '@/pages/purchase/PurchaseReturnList'
import PurchaseReturnNew from '@/pages/purchase/PurchaseReturnNew'
import PurchaseReturnView from '@/pages/purchase/PurchaseReturnView'

// 销售管理
import SalesOrderList from '@/pages/sales/SalesOrderList'
import SalesOrderNew from '@/pages/sales/SalesOrderNew'
import SalesOrderView from '@/pages/sales/SalesOrderView'
import SalesReturnList from '@/pages/sales/SalesReturnList'
import SalesReturnNew from '@/pages/sales/SalesReturnNew'
import SalesReturnView from '@/pages/sales/SalesReturnView'

// 库存管理
import InventoryList from '@/pages/inventory/InventoryList'
import InventoryAdjust from '@/pages/inventory/InventoryAdjust'
import InventoryCheck from '@/pages/inventory/InventoryCheck'

// 报损管理
import LossRecordList from '@/pages/loss/LossRecordList'
import LossRecordNew from '@/pages/loss/LossRecordNew'

// 报表中心
import SalesReport from '@/pages/reports/SalesReport'
import PurchaseReport from '@/pages/reports/PurchaseReport'
import InventoryReport from '@/pages/reports/InventoryReport'

// 收支管理
import PaymentList from '@/pages/payment/PaymentList'

// 系统设置
import Settings from '@/pages/settings/Settings'

const isLoggedIn = () => !!localStorage.getItem('token')

const isAdmin = () => {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw).role === 'admin' : false
  } catch {
    return false
  }
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  if (!isAdmin()) return <Navigate to="/" replace />
  return <>{children}</>
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <RequireAuth><MainLayout /></RequireAuth>,
    children: [
      { index: true, element: <Dashboard /> },

      // 基础资料
      { path: 'master/suppliers', element: <SupplierList /> },
      { path: 'master/customers', element: <CustomerList /> },
      { path: 'master/products', element: <ProductList /> },

      // 采购管理
      { path: 'purchase/orders', element: <PurchaseOrderList /> },
      { path: 'purchase/orders/new', element: <PurchaseOrderNew /> },
      { path: 'purchase/orders/:id', element: <PurchaseOrderView /> },
      { path: 'purchase/orders/:id/edit', element: <PurchaseOrderNew /> },
      { path: 'purchase/returns', element: <PurchaseReturnList /> },
      { path: 'purchase/returns/new', element: <PurchaseReturnNew /> },
      { path: 'purchase/returns/:id', element: <PurchaseReturnView /> },
      { path: 'purchase/returns/:id/edit', element: <PurchaseReturnNew /> },

      // 销售管理
      { path: 'sales/orders', element: <SalesOrderList /> },
      { path: 'sales/orders/new', element: <SalesOrderNew /> },
      { path: 'sales/orders/:id', element: <SalesOrderView /> },
      { path: 'sales/orders/:id/edit', element: <SalesOrderNew /> },
      { path: 'sales/returns', element: <SalesReturnList /> },
      { path: 'sales/returns/new', element: <SalesReturnNew /> },
      { path: 'sales/returns/:id', element: <SalesReturnView /> },
      { path: 'sales/returns/:id/edit', element: <SalesReturnNew /> },

      // 库存管理
      { path: 'inventory', element: <InventoryList /> },
      { path: 'inventory/adjust', element: <InventoryAdjust /> },
      { path: 'inventory/check', element: <InventoryCheck /> },

      // 报损管理
      { path: 'loss', element: <LossRecordList /> },
      { path: 'loss/new', element: <LossRecordNew /> },

      // 报表中心
      { path: 'reports/sales', element: <SalesReport /> },
      { path: 'reports/purchase', element: <PurchaseReport /> },
      { path: 'reports/inventory', element: <InventoryReport /> },

      // 收支管理
      { path: 'payment', element: <PaymentList /> },

      // 系统设置 (admin only)
      { path: 'settings', element: <RequireAdmin><Settings /></RequireAdmin> },
    ],
  },
])

export default router

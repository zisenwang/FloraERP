import { useEffect, useState } from 'react'
import { Table, Button, DatePicker, Select, Tag, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { getPurchaseOrders, type PurchaseOrder } from '@/api/purchase'
import { getSuppliers, type Supplier } from '@/api/suppliers'
import { getErrorMessage } from '@/utils/error'
import styles from './Purchase.module.css'

const { RangePicker } = DatePicker

const STATUS_COLOR: Record<string, string> = {
  '已入库': 'green',
  '待入库': 'orange',
  '部分付款': 'blue',
}

export default function PurchaseOrderList() {
  const { message } = App.useApp()
  const navigate = useNavigate()

  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [supplierId, setSupplierId] = useState<number | undefined>()
  const [dateRange, setDateRange] = useState<[string, string] | undefined>()

  const fetchOrders = (sid?: number, range?: [string, string]) => {
    setLoading(true)
    getPurchaseOrders({
      supplierId: sid,
      startDate: range?.[0],
      endDate: range?.[1],
    })
      .then(setOrders)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchOrders()
    getSuppliers().then(setSuppliers).catch(() => {})
  }, [])

  const columns: ColumnsType<PurchaseOrder> = [
    { title: '单号', dataIndex: 'orderNo', width: 160 },
    { title: '供应商', dataIndex: 'supplierName', width: 100 },
    { title: '日期', dataIndex: 'orderDate', width: 110 },
    {
      title: '金额', dataIndex: 'totalAmount', width: 110,
      render: (v: number) => `¥${v.toLocaleString()}`,
      align: 'right',
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: '操作', width: 80, fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => navigate(`/purchase/orders/${record.id}`)}>
          查看
        </Button>
      ),
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>采购单据</div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Select
            placeholder="选择供应商"
            allowClear
            style={{ width: 160 }}
            options={suppliers.map(s => ({ value: s.id, label: `${s.code} ${s.name}` }))}
            onChange={val => {
              setSupplierId(val)
              fetchOrders(val, dateRange)
            }}
          />
          <RangePicker
            onChange={(_, strs) => {
              const range = strs[0] && strs[1] ? [strs[0], strs[1]] as [string, string] : undefined
              setDateRange(range)
              fetchOrders(supplierId, range)
            }}
          />
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchase/orders/new')}>
          采购入库
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={orders}
        loading={loading}
        size="middle"
        scroll={{ x: 700 }}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
        expandable={{
          expandedRowRender: record => (
            <Table
              rowKey="productCode"
              size="small"
              pagination={false}
              dataSource={record.items}
              columns={[
                { title: '编码', dataIndex: 'productCode', width: 100 },
                { title: '货品名称', dataIndex: 'productName' },
                { title: '数量', dataIndex: 'qty', width: 80 },
                { title: '单价', dataIndex: 'unitPrice', width: 80, render: (v: number) => `¥${v}` },
                { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v.toLocaleString()}` },
              ]}
            />
          ),
        }}
      />
    </>
  )
}

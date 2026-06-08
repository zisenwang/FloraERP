import { useEffect, useState } from 'react'
import { Table, Button, DatePicker, Select, Tag, App, Spin } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { getPurchaseOrders, getPurchaseOrder, type PurchaseOrder, type PurchaseOrderItem } from '@/api/purchase'
import { getSuppliers, type Supplier } from '@/api/suppliers'
import { getErrorMessage } from '@/utils/error'
import styles from './Purchase.module.css'

const { RangePicker } = DatePicker

const STATUS_COLOR: Record<string, string> = {
  '已入库': 'green',
  '草稿':   'orange',
}

export default function PurchaseOrderList() {
  const { message } = App.useApp()
  const navigate = useNavigate()

  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [supplierId, setSupplierId] = useState<number | undefined>()
  const [dateRange, setDateRange] = useState<[string, string] | undefined>()

  // items cache: orderId → items
  const [itemsMap, setItemsMap] = useState<Record<number, PurchaseOrderItem[]>>({})
  const [expandLoading, setExpandLoading] = useState<Record<number, boolean>>({})

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

  const handleExpand = (expanded: boolean, record: PurchaseOrder) => {
    if (!expanded || itemsMap[record.id] !== undefined) return
    setExpandLoading(prev => ({ ...prev, [record.id]: true }))
    getPurchaseOrder(record.id)
      .then(order => setItemsMap(prev => ({ ...prev, [record.id]: order.items ?? [] })))
      .catch(() => setItemsMap(prev => ({ ...prev, [record.id]: [] })))
      .finally(() => setExpandLoading(prev => ({ ...prev, [record.id]: false })))
  }

  const columns: ColumnsType<PurchaseOrder> = [
    { title: '单号', dataIndex: 'orderNo', width: 160, align: 'center' },
    { title: '供应商', dataIndex: 'supplierName', width: 120, align: 'center' },
    { title: '日期', dataIndex: 'orderDate', width: 110, align: 'center' },
    {
      title: '数量', dataIndex: 'totalQty', width: 90, align: 'center',
    },
    {
      title: '金额', dataIndex: 'totalAmount', width: 110,
      render: (v: number) => `¥${v.toLocaleString()}`,
      align: 'right',
    },
    {
      title: '状态', dataIndex: 'status', width: 90, align: 'center',
      render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: '操作', width: 80, fixed: 'right', align: 'center',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => navigate(`/purchase/orders/${record.id}`)}>
          查看
        </Button>
      ),
    },
  ]

  const itemColumns: ColumnsType<PurchaseOrderItem> = [
    { title: '编码',     dataIndex: 'productCode', width: 100, align: 'center' },
    { title: '货品名称', dataIndex: 'productName',  width: 160, align: 'center' },
    { title: '品类',     dataIndex: 'category',     width: 90,  align: 'center', render: (v: string) => v ?? '—' },
    { title: '等级',     dataIndex: 'grade',        width: 70,  align: 'center', render: (v: string) => v ?? '—' },
    { title: '单位',     dataIndex: 'unit',         width: 60,  align: 'center' },
    { title: '数量',     dataIndex: 'qty',          width: 70,  align: 'center' },
    { title: '单价',     dataIndex: 'unitPrice',    width: 90,  align: 'center',  render: (v: number) => `¥${v}` },
    { title: '金额',     dataIndex: 'amount',       width: 100, align: 'center',  render: (v: number) => `¥${v.toLocaleString()}` },
    { title: '折扣',     dataIndex: 'discount',     width: 65,  align: 'center', render: (v: number) => `${v}%` },
    { title: '折后金额', dataIndex: 'finalAmount',  width: 110, align: 'center',  render: (v: number) => `¥${v.toLocaleString()}` },
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
          onExpand: handleExpand,
          expandedRowRender: record => {
            if (expandLoading[record.id]) {
              return <Spin size="small" style={{ padding: '8px 16px', display: 'block' }} />
            }
            return (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={itemsMap[record.id] ?? []}
                columns={itemColumns}
                scroll={{ x: 920 }}
              />
            )
          },
        }}
      />
    </>
  )
}

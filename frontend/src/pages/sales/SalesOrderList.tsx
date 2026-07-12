import { useEffect, useState } from 'react'
import { Table, Button, Select, DatePicker, Input, Tag, App, Spin } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import {
  getSalesOrders, getSalesOrder, deleteSalesOrder,
  getSalesReturns, getSalesReturn, deleteSalesReturn,
  type SalesOrder, type SalesOrderItem,
  type SalesReturn, type SalesReturnItem,
} from '@/api/sales'
import { getErrorMessage } from '@/utils/error'
import { PAGE_SIZE } from '@/constants/pagination'
import AddPaymentModal from '@/components/AddPaymentModal'
import styles from './Sales.module.css'

const PAY_STATUS_MAP: Record<string, { color: string }> = {
  '未收款':  { color: 'red'    },
  '部分收款': { color: 'orange' },
  '已收款':  { color: 'green'  },
}

// Unified row for combined display
interface UnifiedRow {
  _key: string
  rowType: 'order' | 'return'
  id: number
  date: string
  no: string
  customerName: string
  customerCode: string
  customerId: number
  qty: number
  amount: number
  pieces: number
  profit: number
  paymentStatus?: string
  time: string
}

function toUnified(o: SalesOrder): UnifiedRow {
  return {
    _key: `order-${o.id}`,
    rowType: 'order',
    id: o.id,
    date: o.orderDate,
    no: o.orderNo,
    customerName: o.customerName,
    customerCode: o.customerCode,
    customerId: o.customerId,
    qty: o.totalQty,
    amount: o.totalAmount,
    pieces: o.totalPieces,
    profit: o.totalProfit,
    paymentStatus: o.paymentStatus,
    time: o.createdAt,
  }
}

function toUnifiedReturn(r: SalesReturn): UnifiedRow {
  return {
    _key: `return-${r.id}`,
    rowType: 'return',
    id: r.id,
    date: r.returnDate,
    no: r.returnNo,
    customerName: r.customerName,
    customerCode: r.customerCode,
    customerId: r.customerId,
    qty: r.totalQty,
    amount: r.totalAmount,
    pieces: r.totalPieces,
    profit: 0,
    time: r.createdAt,
  }
}

export default function SalesOrderList() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()

  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [returns, setReturns] = useState<SalesReturn[]>([])
  const [loading, setLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(1, 'month').startOf('month'),
    dayjs().endOf('month'),
  ])
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>()

  const [quickPayOrderId, setQuickPayOrderId] = useState<number | null>(null)

  // expand detail cache
  const [orderItemsMap, setOrderItemsMap] = useState<Record<number, SalesOrderItem[]>>({})
  const [returnItemsMap, setReturnItemsMap] = useState<Record<number, SalesReturnItem[]>>({})
  const [expandLoading, setExpandLoading] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})

  const fetchAll = () => {
    setLoading(true)
    const startDate = dateRange[0].format('YYYY-MM-DD')
    const endDate   = dateRange[1].format('YYYY-MM-DD')
    const fetchOrders = paymentStatus !== '退货'
      ? getSalesOrders({ startDate, endDate, paymentStatus })
      : Promise.resolve([] as SalesOrder[])
    const fetchReturns = !paymentStatus || paymentStatus === '退货'
      ? getSalesReturns({ startDate, endDate })
      : Promise.resolve([] as SalesReturn[])
    Promise.all([fetchOrders, fetchReturns])
      .then(([o, r]) => { setOrders(o); setReturns(r) })
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [dateRange, paymentStatus])

  const handleExpand = (expanded: boolean, row: UnifiedRow) => {
    if (!expanded) return
    if (row.rowType === 'order') {
      if (orderItemsMap[row.id] !== undefined) return
      setExpandLoading(prev => ({ ...prev, [row._key]: true }))
      getSalesOrder(row.id)
        .then(o => setOrderItemsMap(prev => ({ ...prev, [row.id]: o.items ?? [] })))
        .catch(() => setOrderItemsMap(prev => ({ ...prev, [row.id]: [] })))
        .finally(() => setExpandLoading(prev => ({ ...prev, [row._key]: false })))
    } else {
      if (returnItemsMap[row.id] !== undefined) return
      setExpandLoading(prev => ({ ...prev, [row._key]: true }))
      getSalesReturn(row.id)
        .then(r => setReturnItemsMap(prev => ({ ...prev, [row.id]: r.items ?? [] })))
        .catch(() => setReturnItemsMap(prev => ({ ...prev, [row.id]: [] })))
        .finally(() => setExpandLoading(prev => ({ ...prev, [row._key]: false })))
    }
  }

  const handleDelete = (row: UnifiedRow) => {
    const label = row.rowType === 'order' ? `销售单「${row.no}」` : `退货单「${row.no}」`
    modal.confirm({
      title: '确认删除',
      content: `删除${label}？库存将同步回退，此操作不可撤销。`,
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => {
        setDeleting(prev => ({ ...prev, [row._key]: true }))
        const req = row.rowType === 'order'
          ? deleteSalesOrder(row.id)
          : deleteSalesReturn(row.id)
        return req
          .then(() => { message.success('删除成功'); fetchAll() })
          .catch(err => message.error(getErrorMessage(err)))
          .finally(() => setDeleting(prev => ({ ...prev, [row._key]: false })))
      },
    })
  }

  const kw = customerSearch.trim().toLowerCase()
  const combined: UnifiedRow[] =[
    ...orders.map(toUnified),
    ...returns.map(toUnifiedReturn),
  ]
    .filter(r => !kw || r.customerName?.toLowerCase().includes(kw) || r.customerCode?.toLowerCase().includes(kw))
    .sort((a, b) => b.time.localeCompare(a.time))

  const columns: ColumnsType<UnifiedRow> = [
    { title: '日期', dataIndex: 'date', width: 110, align: 'center' },
    {
      title: '客户', width: 150, align: 'center',
      render: (_, r) => `${r.customerCode} ${r.customerName}`,
    },
    {
      title: '单号', width: 175, align: 'center',
      render: (_, r) => (
        <span>
          {r.rowType === 'return' && <Tag color="orange" style={{ marginRight: 4 }}>退</Tag>}
          {r.no}
        </span>
      ),
    },
    { title: '数量', dataIndex: 'qty', width: 80, align: 'center' },
    {
      title: '合计金额', dataIndex: 'amount', width: 110, align: 'center',
      render: (v: number, r) => (
        <span style={{ color: r.rowType === 'return' ? '#cf1322' : undefined }}>
          {r.rowType === 'return' ? '-' : ''}¥{v.toFixed(2)}
        </span>
      ),
    },
    { title: '件数', dataIndex: 'pieces', width: 80, align: 'center' },
    {
      title: '收款状态', width: 100, align: 'center',
      render: (_, r) => {
        if (r.rowType === 'return') return <Tag color="default">退货</Tag>
        const s = PAY_STATUS_MAP[r.paymentStatus ?? ''] ?? { color: 'default' }
        const isUnpaid = r.paymentStatus === '未收款'
        return (
          <Tag
            color={s.color}
            style={isUnpaid ? { cursor: 'pointer' } : undefined}
            onClick={isUnpaid ? () => setQuickPayOrderId(r.id) : undefined}
          >
            {r.paymentStatus}
          </Tag>
        )
      },
    },
    {
      title: '总毛利', dataIndex: 'profit', width: 110, align: 'center',
      render: (v: number, r) => {
        if (r.rowType === 'return') return <span style={{ color: '#aaa' }}>—</span>
        return (
          <span style={{ color: v >= 0 ? '#389e0d' : '#cf1322', fontWeight: 600 }}>
            {v >= 0 ? '+' : ''}¥{v.toFixed(2)}
          </span>
        )
      },
    },
    {
      title: '操作', width: 140, fixed: 'right', align: 'center',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button type="link" size="small"
            onClick={() => navigate(row.rowType === 'order' ? `/sales/orders/${row.id}` : `/sales/returns/${row.id}`)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => navigate(row.rowType === 'order' ? `/sales/orders/${row.id}/edit` : `/sales/returns/${row.id}/edit`)} />
          <Button type="link" size="small" danger icon={<DeleteOutlined />}
            loading={deleting[row._key]}
            onClick={() => handleDelete(row)} />
        </div>
      ),
    },
  ]

  const orderItemColumns: ColumnsType<SalesOrderItem> = [
    { title: '编码',     dataIndex: 'productCode',  width: 100, align: 'center' },
    { title: '货品名称', dataIndex: 'productName',  width: 160, align: 'center' },
    { title: '供应商',   dataIndex: 'supplierName', width: 120, align: 'center' },
    { title: '单位',     dataIndex: 'unit',         width: 60,  align: 'center' },
    { title: '数量',     dataIndex: 'qty',          width: 70,  align: 'center' },
    { title: '件数',     dataIndex: 'pieces',       width: 70,  align: 'center' },
    { title: '进价',     dataIndex: 'costPrice',    width: 90,  align: 'center', render: (v: number | null) => v != null ? `¥${v.toFixed(2)}` : '—' },
    { title: '单价',     dataIndex: 'unitPrice',    width: 90,  align: 'center', render: (v: number) => `¥${v}` },
    { title: '折扣',     dataIndex: 'discount',     width: 65,  align: 'center', render: (v: number) => `${v ?? 100}%` },
    { title: '折后金额', dataIndex: 'finalAmount',  width: 110, align: 'center', render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '毛利', width: 110, align: 'center',
      render: (_: unknown, r: SalesOrderItem) => {
        r.costPrice ??= 0
        const profit = +(r.finalAmount - r.costPrice * r.qty).toFixed(2)
        return (
          <span style={{ color: profit >= 0 ? '#389e0d' : '#cf1322', fontWeight: 600 }}>
            {profit >= 0 ? '+' : ''}¥{profit.toFixed(2)}
          </span>
        )
      },
    },
  ]

  const returnItemColumns: ColumnsType<SalesReturnItem> = [
    { title: '编码',     dataIndex: 'productCode', width: 100, align: 'center' },
    { title: '货品名称', dataIndex: 'productName', width: 160, align: 'center' },
    { title: '单位',     dataIndex: 'unit',        width: 60,  align: 'center' },
    { title: '数量',     dataIndex: 'qty',         width: 70,  align: 'center' },
    { title: '件数',     dataIndex: 'pieces',      width: 70,  align: 'center', render: (v: number) => v || '—' },
    { title: '单价',     dataIndex: 'unitPrice',   width: 90,  align: 'center', render: (v: number) => `¥${v}` },
    { title: '金额',     dataIndex: 'amount',      width: 100, align: 'center', render: (v: number) => `¥${v.toFixed(2)}` },
  ]

  return (
    <>
      <div className={styles.pageTitle}>销售单据</div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="搜索客户名称或编码"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 200 }}
            value={customerSearch}
            onChange={e => setCustomerSearch(e.target.value)}
          />
          <DatePicker.RangePicker
            value={dateRange}
            onChange={v => {
              const range: [Dayjs, Dayjs] = v && v[0] && v[1]
                ? [v[0], v[1]]
                : [dayjs().subtract(1, 'month').startOf('month'), dayjs().endOf('month')]
              setDateRange(range)
            }}
            presets={[
              { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
              { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
            ]}
          />
          <Select
            allowClear placeholder="收款状态"
            style={{ width: 120 }}
            options={[
              { value: '未收款',  label: '未收款' },
              { value: '部分收款', label: '部分收款' },
              { value: '已收款',  label: '已收款' },
              { value: '退货',    label: '退货' },
            ]}
            onChange={v => setPaymentStatus(v)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/sales/orders/new')}>
            新建销售单
          </Button>
          <Button onClick={() => navigate('/sales/returns/new')}>
            新增退货
          </Button>
        </div>
      </div>

      <Table
        rowKey="_key"
        columns={columns}
        dataSource={combined}
        loading={loading}
        size="middle"
        scroll={{ x: 1050 }}
        pagination={{ pageSize: PAGE_SIZE, showTotal: total => `共 ${total} 条` }}
        rowClassName={(r) => r.rowType === 'return' ? 'return-row' : ''}
        summary={pageData => {
          const calc = (rows: UnifiedRow[]) => {
            const orders  = rows.filter(r => r.rowType === 'order')
            const returns = rows.filter(r => r.rowType === 'return')
            return {
              qty:    orders.reduce((s, r) => s + (r.qty    ?? 0), 0) - returns.reduce((s, r) => s + (r.qty    ?? 0), 0),
              pieces: orders.reduce((s, r) => s + (r.pieces ?? 0), 0) - returns.reduce((s, r) => s + (r.pieces ?? 0), 0),
              amount: orders.reduce((s, r) => s + (r.amount ?? 0), 0) - returns.reduce((s, r) => s + (r.amount ?? 0), 0),
              profit: orders.reduce((s, r) => s + (r.profit ?? 0), 0),
            }
          }
          const page  = calc(pageData as UnifiedRow[])
          const total = calc(combined)
          const SummaryRow = ({ label, d, bg }: { label: string; d: typeof page; bg: string }) => (
            <Table.Summary.Row style={{ background: bg, fontWeight: 600 }}>
              <Table.Summary.Cell index={0} colSpan={4} align="right">{label}</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="center">{d.qty}</Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="center">¥{d.amount.toFixed(2)}</Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="center">{d.pieces}</Table.Summary.Cell>
              <Table.Summary.Cell index={6} />
              <Table.Summary.Cell index={7} align="center">
                <span style={{ color: d.profit >= 0 ? '#389e0d' : '#cf1322' }}>
                  {d.profit >= 0 ? '+' : ''}¥{d.profit.toFixed(2)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8} />
            </Table.Summary.Row>
          )
          return (
            <Table.Summary fixed>
              <SummaryRow label="本页合计" d={page}  bg="#fafafa" />
              <SummaryRow label="全部合计" d={total} bg="#f0f5ff" />
            </Table.Summary>
          )
        }}
        expandable={{
          onExpand: handleExpand,
          expandedRowRender: row => {
            if (expandLoading[row._key]) {
              return <Spin size="small" style={{ padding: '8px 16px', display: 'block' }} />
            }
            if (row.rowType === 'order') {
              return (
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={orderItemsMap[row.id] ?? []}
                  columns={orderItemColumns}
                  scroll={{ x: 860 }}
                />
              )
            }
            return (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={returnItemsMap[row.id] ?? []}
                columns={returnItemColumns}
                scroll={{ x: 650 }}
              />
            )
          },
        }}
      />

      <AddPaymentModal
        open={quickPayOrderId !== null}
        preselectedOrderId={quickPayOrderId}
        onClose={() => setQuickPayOrderId(null)}
        onSuccess={() => { setQuickPayOrderId(null); fetchAll() }}
      />
    </>
  )
}

import { useEffect, useState } from 'react'
import { Table, DatePicker, Input, Button, Tag, Segmented, Select, App } from 'antd'
import { PlusOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getSalesOrders, type SalesOrder } from '@/api/sales'
import { getErrorMessage } from '@/utils/error'
import { exportReceivablesExcel } from '@/utils/exportExcel'
import { C_AMOUNT, C_LABEL } from '@/constants/colors'
import { PAGE_SIZE } from '@/constants/pagination'
import SalesOrderModal from '@/components/SalesOrderModal'
import AddPaymentModal from '@/components/AddPaymentModal'
import styles from './Payment.module.css'

type StatusFilter = 'all' | 'paid' | 'unpaid'
type SearchField = 'customerCode' | 'paymentMethods' | 'paymentNotes'

const SEARCH_FIELD_OPTIONS = [
  { value: 'customerCode',   label: '客户编码' },
  { value: 'paymentMethods', label: '收款方式' },
  { value: 'paymentNotes',   label: '备注' },
]

const PAY_STATUS_COLOR: Record<string, string> = {
  '未收款': 'red', '部分收款': 'orange', '已收款': 'green',
}

const paidOf   = (o: SalesOrder) => o.paidAmount ?? 0
const unpaidOf = (o: SalesOrder) => Math.max(0, o.totalAmount - paidOf(o))

// ─── Payment List Page — one row per sales order ─────────────────────────────

export default function PaymentList() {
  const { message } = App.useApp()
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [searchField, setSearchField] = useState<SearchField>('customerCode')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([dayjs().startOf('month'), dayjs().endOf('month')])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [payOrderId, setPayOrderId] = useState<number | null>(null)
  const [drawerOrderId, setDrawerOrderId] = useState<number | null>(null)

  const fetchOrders = () => {
    setLoading(true)
    getSalesOrders({
      startDate: dateRange?.[0].format('YYYY-MM-DD'),
      endDate:   dateRange?.[1].format('YYYY-MM-DD'),
    })
      // Voided orders are not receivable
      .then(data => setOrders(data.filter(o => o.status !== '作废')))
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders() }, [dateRange])

  const openAddPayment = (orderId: number | null) => {
    setPayOrderId(orderId)
    setAddOpen(true)
  }

  // 客户编码 is an exact match; 收款方式 / 备注 are fuzzy (contains)
  const kw = searchKeyword.trim().toLowerCase()
  const matchesSearch = (o: SalesOrder) => {
    if (!kw) return true
    if (searchField === 'customerCode') return o.customerCode?.toLowerCase() === kw
    return (o[searchField] ?? '').toLowerCase().includes(kw)
  }
  const filtered = orders
    .filter(o =>
      statusFilter === 'all' ||
      (statusFilter === 'paid' ? o.paymentStatus === '已收款' : o.paymentStatus !== '已收款')
    )
    .filter(matchesSearch)

  const totalAmount = filtered.reduce((s, o) => s + o.totalAmount, 0)
  const totalPaid   = filtered.reduce((s, o) => s + paidOf(o), 0)
  const totalUnpaid = filtered.reduce((s, o) => s + unpaidOf(o), 0)
  const paidCount   = filtered.filter(o => paidOf(o) > 0).length
  const unpaidCount = filtered.filter(o => unpaidOf(o) > 0).length

  const columns: ColumnsType<SalesOrder> = [
    { title: '日期', dataIndex: 'orderDate', width: 110 },
    {
      title: '单号', dataIndex: 'orderNo', width: 160,
      render: (v: string, r: SalesOrder) => (
        <Button type="link" size="small" style={{ padding: 0 }}
          onClick={() => setDrawerOrderId(r.id)}>
          {v}
        </Button>
      ),
    },
    {
      title: '客户', width: 160,
      render: (_: unknown, r: SalesOrder) => <span style={{ color: C_LABEL }}>{r.customerCode} {r.customerName}</span>,
    },
    {
      title: '订单金额', dataIndex: 'totalAmount', width: 120, align: 'right',
      render: (v: number) => <span style={{ color: C_AMOUNT, fontWeight: 600 }}>¥{v.toFixed(2)}</span>,
    },
    { title: '收款方式', dataIndex: 'paymentMethods', width: 130, render: (v: string | null) => v || '—' },
    {
      title: '实收', width: 120, align: 'right',
      render: (_: unknown, r: SalesOrder) => <span style={{ color: '#389e0d' }}>¥{paidOf(r).toFixed(2)}</span>,
    },
    {
      title: '状态', dataIndex: 'paymentStatus', width: 130, align: 'center',
      render: (v: string) => <Tag color={PAY_STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
    },
    { title: '备注', dataIndex: 'paymentNotes', width: 200, ellipsis: true, render: (v: string | null) => v || '—' },
    {
      title: '操作', width: 70, align: 'center', fixed: 'right',
      render: (_: unknown, r: SalesOrder) => (
        <Button type="link" size="small" disabled={r.paymentStatus === '已收款'}
          onClick={() => openAddPayment(r.id)}>
          收款
        </Button>
      ),
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>收款管理</div>

      <div className={styles.toolbar}>
        <Select
          value={searchField}
          onChange={v => setSearchField(v as SearchField)}
          options={SEARCH_FIELD_OPTIONS}
          style={{ width: 110 }}
        />
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索关键词"
          allowClear
          style={{ width: 200 }}
          value={searchKeyword}
          onChange={e => setSearchKeyword(e.target.value)}
        />
        <DatePicker.RangePicker
          value={dateRange}
          onChange={v => setDateRange(v as [Dayjs, Dayjs] | null)}
          presets={[
            { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
            { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
          ]}
        />
        <Button
          icon={<DownloadOutlined />}
          onClick={() => {
            const sd = dateRange?.[0].format('YYYY-MM-DD') ?? ''
            const ed = dateRange?.[1].format('YYYY-MM-DD') ?? ''
            exportReceivablesExcel(filtered, sd, ed)
          }}
        >
          导出
        </Button>
        <Segmented
          options={[
            { label: '全部', value: 'all' },
            { label: '已收款', value: 'paid' },
            { label: '未收款', value: 'unpaid' },
          ]}
          value={statusFilter}
          onChange={v => setStatusFilter(v as StatusFilter)}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openAddPayment(null)}>
          新增收款
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        size="small"
        scroll={{ x: 1100 }}
        pagination={{ pageSize: PAGE_SIZE, showTotal: total => `共 ${total} 条` }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ fontWeight: 600, background: '#f0f5ff' }}>
              <Table.Summary.Cell index={0} />
              <Table.Summary.Cell index={1} />
              <Table.Summary.Cell index={2} align="center">合计总额（{filtered.length} 单）</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="center">
                <span style={{ color: C_AMOUNT }}>¥{totalAmount.toFixed(2)}</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="center">合计已收（{paidCount} 单）</Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="center">
                <span style={{ color: '#389e0d' }}>¥{totalPaid.toFixed(2)}</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="center">合计未付款（{unpaidCount} 单）</Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="center">
                <span style={{ color: '#cf1322' }}>¥{totalUnpaid.toFixed(2)}</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      <AddPaymentModal
        open={addOpen}
        preselectedOrderId={payOrderId}
        onClose={() => { setAddOpen(false); setPayOrderId(null) }}
        onSuccess={fetchOrders}
      />

      <SalesOrderModal
        orderId={drawerOrderId}
        onClose={() => setDrawerOrderId(null)}
        showPayments
        onPaymentsChange={fetchOrders}
      />
    </>
  )
}

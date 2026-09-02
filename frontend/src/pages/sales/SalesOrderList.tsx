import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Select, DatePicker, Input, Tag, App, Popconfirm, Segmented } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  SearchOutlined,
  DownloadOutlined,
  FilterOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import {
  getSalesOrders, voidSalesOrder,
  getSalesReturns, voidSalesReturn,
  getSalesOrdersDetail,
  type SalesOrder,
  type SalesReturn,
  type SalesDetailRow,
} from '@/api/sales'
import { getErrorMessage } from '@/utils/error'
import { exportSalesOrdersExcel, exportSalesOrdersDetailExcel } from '@/utils/exportExcel'
import { C_AMOUNT, C_LABEL } from '@/constants/colors'
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
  status?: string
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
    status: o.status,
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

const SEARCH_FIELD_OPTIONS = [
  { value: 'customerName', label: '客户名称' },
  { value: 'customerCode', label: '客户编码' },
  { value: 'orderNo',      label: '单号' },
  { value: 'productCode',  label: '产品编码' },
  { value: 'productName',  label: '产品名称' },
  { value: 'operator',     label: '经办人' },
  { value: 'notes',        label: '备注' },
]

export default function SalesOrderList() {
  const navigate = useNavigate()
  const { message } = App.useApp()

  const [mode, setMode] = useState<'summary' | 'detail'>('summary')

  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [returns, setReturns] = useState<SalesReturn[]>([])
  const [loading, setLoading] = useState(false)

  // Search state — input (UI) vs applied (committed on button click)
  const [searchField, setSearchField] = useState<string>('customerName')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [appliedField, setAppliedField] = useState<string>('customerName')
  const [appliedKeyword, setAppliedKeyword] = useState('')

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])
  const [quickPayOrderId, setQuickPayOrderId] = useState<number | null>(null)

  const [voiding, setVoiding] = useState<Record<string, boolean>>({})
  const [payFilter, setPayFilter] = useState<string>('all')

  // Detail mode
  const [detailRows, setDetailRows] = useState<SalesDetailRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchAll = useCallback(() => {
    setLoading(true)
    const startDate = dateRange[0].format('YYYY-MM-DD')
    const endDate   = dateRange[1].format('YYYY-MM-DD')
    const search = appliedKeyword.trim() || undefined
    const fetchOrders = getSalesOrders({ startDate, endDate, search, searchField: search ? appliedField : undefined })
    const fetchReturns = getSalesReturns({ startDate, endDate, search, searchField: search ? appliedField : undefined })
    Promise.all([fetchOrders, fetchReturns])
      .then(([o, r]) => { setOrders(o); setReturns(r) })
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [dateRange, appliedKeyword, appliedField])

  const fetchDetail = useCallback(() => {
    setDetailLoading(true)
    const startDate = dateRange[0].format('YYYY-MM-DD')
    const endDate   = dateRange[1].format('YYYY-MM-DD')
    const search = appliedKeyword.trim() || undefined
    getSalesOrdersDetail({
      startDate,
      endDate,
      search,
      searchField: search ? appliedField : undefined,
    })
      .then(rows => setDetailRows(rows))
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setDetailLoading(false))
  }, [dateRange, appliedKeyword, appliedField])

  useEffect(() => {
    if (mode === 'summary') fetchAll()
    else fetchDetail()
  }, [mode, dateRange, appliedKeyword, appliedField])

  const handleSearch = () => {
    setAppliedField(searchField)
    setAppliedKeyword(searchKeyword)
  }

  const handleVoid = async (row: UnifiedRow) => {
    setVoiding(prev => ({ ...prev, [row._key]: true }))
    try {
      if (row.rowType === 'order') await voidSalesOrder(row.id)
      else await voidSalesReturn(row.id)
      message.success('已作废')
      fetchAll()
    } catch (err) {
      message.error(getErrorMessage(err))
    } finally {
      setVoiding(prev => ({ ...prev, [row._key]: false }))
    }
  }

  const allCombined: UnifiedRow[] = [
    ...orders.map(toUnified),
    ...returns.map(toUnifiedReturn),
  ].sort((a, b) => b.time.localeCompare(a.time))

  const combined = payFilter === 'all' ? allCombined
    : payFilter === '退货' ? allCombined.filter(r => r.rowType === 'return')
    : allCombined.filter(r => r.rowType === 'order' && r.paymentStatus === payFilter)

  const columns: ColumnsType<UnifiedRow> = [
    { title: '日期', dataIndex: 'date', align: 'center', sorter: (a, b) => a.date.localeCompare(b.date) },
    {
      title: '客户', align: 'center',
      sorter: (a, b) => a.customerName.localeCompare(b.customerName),
      render: (_, r) => `${r.customerCode} ${r.customerName}`,
    },
    {
      title: '单号', align: 'center',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.no.localeCompare(b.no),
      render: (_, r) => (
        <span>
          {r.rowType === 'return' && <Tag color="orange" style={{ marginRight: 4 }}>退</Tag>}
          <span style={{ color: C_LABEL }}>{r.no}</span>
        </span>
      ),
    },
    { title: '数量', dataIndex: 'qty', align: 'center', sorter: (a, b) => a.qty - b.qty },
    {
      title: '合计金额', dataIndex: 'amount', align: 'center',
      sorter: (a, b) => a.amount - b.amount,
      render: (v: number, r) => (
        <span style={{ color: r.rowType === 'return' ? '#cf1322' : C_AMOUNT, fontWeight: 600 }}>
          {r.rowType === 'return' ? '-' : ''}¥{v.toFixed(2)}
        </span>
      ),
    },
    { title: '件数', dataIndex: 'pieces', align: 'center', sorter: (a, b) => a.pieces - b.pieces },
    {
      title: '收款状态', align: 'center',
      render: (_, r) => {
        if (r.rowType === 'return') return <Tag color="default">退货</Tag>
        if (r.status === '作废') return <Tag color="default">已作废</Tag>
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
      title: '操作', align: 'center',
      render: (_, row) => {
        const isVoided = row.status === '作废'
        return (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            <Button type="link" size="small"
              onClick={() => navigate(row.rowType === 'order' ? `/sales/orders/${row.id}` : `/sales/returns/${row.id}`)}>
              查看
            </Button>
            <Button type="link" size="small" icon={<EditOutlined />}
              onClick={() => navigate(row.rowType === 'order' ? `/sales/orders/${row.id}/edit` : `/sales/returns/${row.id}/edit`)} />
            {!isVoided && (
              <Popconfirm
                title="作废此单"
                description="作废后数量归零，单据保留，可重新编辑恢复。"
                okText="确认作废" okType="danger" cancelText="取消"
                onConfirm={() => handleVoid(row)}
              >
                <Button type="link" size="small" danger icon={<StopOutlined />}
                  loading={voiding[row._key]} />
              </Popconfirm>
            )}
          </div>
        )
      },
    },
  ]

  // ——— Detail mode columns ———
  const detailColumns: ColumnsType<SalesDetailRow> = [
    { title: '日期',     dataIndex: 'date',         width: 110, align: 'center', sorter: (a, b) => a.date.localeCompare(b.date) },
    {
      title: '客户', width: 150, align: 'center',
      sorter: (a, b) => a.customerName.localeCompare(b.customerName),
      render: (_, r) => `${r.customerCode} ${r.customerName}`,
    },
    { title: '单号',     dataIndex: 'no',           width: 175, align: 'center', defaultSortOrder: 'descend', sorter: (a, b) => a.no.localeCompare(b.no) },
    { title: '产品编码', dataIndex: 'productCode',  width: 120, align: 'center', sorter: (a, b) => a.productCode.localeCompare(b.productCode) },
    { title: '产品名称', dataIndex: 'productName',  width: 160, align: 'center', sorter: (a, b) => a.productName.localeCompare(b.productName) },
    { title: '供应商',   dataIndex: 'supplierCode', width: 90,  align: 'center', sorter: (a, b) => (a.supplierCode ?? '').localeCompare(b.supplierCode ?? '') },
    { title: '单位',     dataIndex: 'unit',         width: 60,  align: 'center' },
    { title: '数量',     dataIndex: 'qty',          width: 70,  align: 'center', sorter: (a, b) => a.qty - b.qty },
    { title: '单价',     dataIndex: 'unitPrice',    width: 90,  align: 'center', sorter: (a, b) => a.unitPrice - b.unitPrice, render: (v: number) => `¥${v}` },
    {
      title: '金额', dataIndex: 'amount', width: 110, align: 'center',
      sorter: (a, b) => a.amount - b.amount,
      render: (v: number, r) => (
        <span style={{ color: r.rowType === 'return' ? '#cf1322' : C_AMOUNT, fontWeight: 600 }}>
          {r.rowType === 'return' ? '-' : ''}¥{v.toFixed(2)}
        </span>
      ),
    },
    { title: '件数', dataIndex: 'pieces', width: 70, align: 'center', sorter: (a, b) => (a.pieces ?? 0) - (b.pieces ?? 0) },
    {
      title: '毛利', dataIndex: 'profit', width: 110, align: 'center',
      sorter: (a, b) => (a.profit ?? 0) - (b.profit ?? 0),
      render: (v: number | null) => {
        if (v == null) return <span style={{ color: '#aaa' }}>—</span>
        return (
          <span style={{ color: v >= 0 ? '#389e0d' : '#cf1322', fontWeight: 600 }}>
            {v >= 0 ? '+' : ''}¥{v.toFixed(2)}
          </span>
        )
      },
    },
    { title: '经办人', dataIndex: 'operator', width: 90,  align: 'center', render: (v: string | null) => v ?? '—' },
    { title: '备注',   dataIndex: 'notes',    width: 120, align: 'center', render: (v: string | null) => v ?? '—' },
  ]

  const calcDetailSummary = (rows: SalesDetailRow[]) => {
    const orderRows  = rows.filter(r => r.rowType === 'order')
    const returnRows = rows.filter(r => r.rowType === 'return')
    return {
      qty:    orderRows.reduce((s, r) => s + (r.qty    ?? 0), 0) - returnRows.reduce((s, r) => s + (r.qty    ?? 0), 0),
      pieces: orderRows.reduce((s, r) => s + (r.pieces ?? 0), 0) - returnRows.reduce((s, r) => s + (r.pieces ?? 0), 0),
      amount: orderRows.reduce((s, r) => s + (r.amount ?? 0), 0) - returnRows.reduce((s, r) => s + (r.amount ?? 0), 0),
      profit: orderRows.reduce((s, r) => s + (r.profit ?? 0), 0),
    }
  }

  return (
    <>
      <div className={styles.pageTitle}>销售单据</div>

      {/* Row 1: mode switch + date + status filter */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <Segmented
          options={[{ label: '汇总', value: 'summary' }, { label: '明细', value: 'detail' }]}
          value={mode}
          onChange={v => setMode(v as 'summary' | 'detail')}
        />
        <DatePicker.RangePicker
          value={dateRange}
          onChange={v => {
            const range: [Dayjs, Dayjs] = v && v[0] && v[1]
              ? [v[0], v[1]]
              : [dayjs().startOf('month'), dayjs().endOf('month')]
            setDateRange(range)
          }}
          presets={[
            { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
            { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
          ]}
        />
        {mode === 'summary' && (
          <Select
            value={payFilter}
            onChange={v => setPayFilter(v)}
            style={{ width: 100 }}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '未收款', value: '未收款' },
              { label: '已收款', value: '已收款' },
              { label: '退货', value: '退货' },
            ]}
          />
        )}
      </div>

      {/* Row 2: search bar + action buttons */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <FilterOutlined style={{ color: '#888' }} />
        <Select
          value={searchField}
          onChange={v => setSearchField(v)}
          options={SEARCH_FIELD_OPTIONS}
          style={{ width: 110 }}
        />
        <Input
          placeholder="搜索关键词"
          allowClear
          style={{ width: 200 }}
          value={searchKeyword}
          onChange={e => {
            setSearchKeyword(e.target.value)
            if (!e.target.value) { setAppliedKeyword(''); setAppliedField(searchField) }
          }}
          onPressEnter={handleSearch}
        />
        <Button icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
        <div style={{ flex: 1 }} />
        <Button
          icon={<DownloadOutlined />}
          onClick={() => {
            const sd = dateRange[0].format('YYYY-MM-DD')
            const ed = dateRange[1].format('YYYY-MM-DD')
            if (mode === 'summary') exportSalesOrdersExcel(combined, sd, ed)
            else exportSalesOrdersDetailExcel(detailRows, sd, ed)
          }}
        >
          导出
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/sales/orders/new')}>
          新建销售单
        </Button>
        <Button onClick={() => navigate('/sales/returns/new')}>
          新增退货
        </Button>
      </div>

      {mode === 'summary' ? (
        <Table
          rowKey="_key"
          columns={columns}
          dataSource={combined}
          loading={loading}
          size="middle"
          pagination={{ pageSize: PAGE_SIZE, showTotal: total => `共 ${total} 条` }}
          rowClassName={(r) => r.rowType === 'return' ? 'return-row' : ''}
          summary={pageData => {
            const calc = (rows: UnifiedRow[]) => {
              const orderRows  = rows.filter(r => r.rowType === 'order')
              const returnRows = rows.filter(r => r.rowType === 'return')
              return {
                qty:    orderRows.reduce((s, r) => s + (r.qty    ?? 0), 0) - returnRows.reduce((s, r) => s + (r.qty    ?? 0), 0),
                pieces: orderRows.reduce((s, r) => s + (r.pieces ?? 0), 0) - returnRows.reduce((s, r) => s + (r.pieces ?? 0), 0),
                amount: orderRows.reduce((s, r) => s + (r.amount ?? 0), 0) - returnRows.reduce((s, r) => s + (r.amount ?? 0), 0),
                profit: orderRows.reduce((s, r) => s + (r.profit ?? 0), 0),
              }
            }
            const page  = calc(pageData as UnifiedRow[])
            const total = calc(combined)
            const SummaryRow = ({ label, d, bg }: { label: string; d: typeof page; bg: string }) => (
              <Table.Summary.Row style={{ background: bg, fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={3} align="right">{label}</Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="center">{d.qty}</Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="center">¥{d.amount.toFixed(2)}</Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="center">{d.pieces}</Table.Summary.Cell>
                <Table.Summary.Cell index={6} />
                <Table.Summary.Cell index={7} />
              </Table.Summary.Row>
            )
            return (
              <Table.Summary fixed>
                <SummaryRow label="本页合计" d={page}  bg="#fafafa" />
                <SummaryRow label="全部合计" d={total} bg="#f0f5ff" />
              </Table.Summary>
            )
          }}
        />
      ) : (
        <Table
          rowKey={(r, i) => `${r.no}-${r.productCode}-${i}`}
          columns={detailColumns}
          dataSource={detailRows}
          loading={detailLoading}
          size="middle"
          scroll={{ x: 1400 }}
          pagination={{ pageSize: PAGE_SIZE, showTotal: total => `共 ${total} 条` }}
          summary={pageData => {
            const page  = calcDetailSummary(pageData as SalesDetailRow[])
            const total = calcDetailSummary(detailRows)
            const SummaryRow = ({ label, d, bg }: { label: string; d: typeof page; bg: string }) => (
              <Table.Summary.Row style={{ background: bg, fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={7} align="right">{label}</Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="center">{d.qty}</Table.Summary.Cell>
                <Table.Summary.Cell index={8} />
                <Table.Summary.Cell index={9} align="center">¥{d.amount.toFixed(2)}</Table.Summary.Cell>
                <Table.Summary.Cell index={10} align="center">{d.pieces}</Table.Summary.Cell>
                <Table.Summary.Cell index={11} align="center">
                  <span style={{ color: d.profit >= 0 ? '#389e0d' : '#cf1322' }}>
                    {d.profit >= 0 ? '+' : ''}¥{d.profit.toFixed(2)}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={12} />
                <Table.Summary.Cell index={13} />
              </Table.Summary.Row>
            )
            return (
              <Table.Summary fixed>
                <SummaryRow label="本页合计" d={page}  bg="#fafafa" />
                <SummaryRow label="全部合计" d={total} bg="#f0f5ff" />
              </Table.Summary>
            )
          }}
        />
      )}

      <AddPaymentModal
        open={quickPayOrderId !== null}
        preselectedOrderId={quickPayOrderId}
        onClose={() => setQuickPayOrderId(null)}
        onSuccess={() => { setQuickPayOrderId(null); fetchAll() }}
      />
    </>
  )
}

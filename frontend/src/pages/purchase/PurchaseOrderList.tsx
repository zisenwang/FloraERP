import { useEffect, useState, useCallback } from 'react'
import { Table, Button, DatePicker, Input, Tag, Select, App, Popconfirm, Segmented } from 'antd'
import { PlusOutlined, EditOutlined, StopOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import {
  getPurchaseOrders, voidPurchaseOrder,
  getPurchaseReturns, voidPurchaseReturn,
  getPurchaseOrdersDetail,
  type PurchaseOrder,
  type PurchaseReturn,
  type PurchaseDetailRow,
} from '@/api/purchase'
import { getErrorMessage } from '@/utils/error'
import { exportPurchaseOrdersExcel, exportPurchaseOrdersDetailExcel } from '@/utils/exportExcel'
import { C_AMOUNT, C_LABEL } from '@/constants/colors'
import { PAGE_SIZE } from '@/constants/pagination'
import styles from './Purchase.module.css'

const { RangePicker } = DatePicker

const STATUS_COLOR: Record<string, string> = {
  '已入库': 'green',
  '作废':   'default',
}

interface UnifiedRow {
  _key: string
  rowType: 'order' | 'return'
  id: number
  date: string
  time: string
  no: string
  supplierName: string
  supplierCode: string
  supplierId: number
  qty: number
  amount: number
  pieces: number
  status?: string
  voided?: boolean
}

function toUnified(o: PurchaseOrder): UnifiedRow {
  return {
    _key: `order-${o.id}`,
    rowType: 'order',
    id: o.id,
    date: o.orderDate,
    time: o.createdAt,
    no: o.orderNo,
    supplierName: o.supplierName,
    supplierCode: o.supplierCode,
    supplierId: o.supplierId,
    qty: o.totalQty,
    amount: o.totalAmount,
    pieces: o.totalPieces ?? 0,
    status: o.status,
    voided: o.status === '作废',
  }
}

function toUnifiedReturn(r: PurchaseReturn): UnifiedRow {
  return {
    _key: `return-${r.id}`,
    rowType: 'return',
    id: r.id,
    date: r.returnDate,
    time: r.createdAt,
    no: r.returnNo,
    supplierName: r.supplierName,
    supplierCode: r.supplierCode,
    supplierId: r.supplierId,
    qty: r.totalQty,
    amount: r.totalAmount,
    pieces: r.totalPieces ?? 0,
  }
}

const SEARCH_FIELD_OPTIONS = [
  { value: 'supplierName', label: '供应商名称' },
  { value: 'supplierCode', label: '供应商编码' },
  { value: 'orderNo',      label: '单号' },
  { value: 'productCode',  label: '产品编码' },
  { value: 'productName',  label: '产品名称' },
  { value: 'operator',     label: '经办人' },
  { value: 'notes',        label: '备注' },
]

export default function PurchaseOrderList() {
  const { message } = App.useApp()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'summary' | 'detail'>('summary')

  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [returns, setReturns] = useState<PurchaseReturn[]>([])
  const [loading, setLoading] = useState(false)

  // Search state
  const [searchField, setSearchField] = useState<string>('supplierName')
  const [searchKeyword, setSearchKeyword] = useState('')

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])
  const [voiding, setVoiding] = useState<Record<string, boolean>>({})

  // Detail mode
  const [detailRows, setDetailRows] = useState<PurchaseDetailRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchAll = useCallback((range = dateRange) => {
    setLoading(true)
    const startDate = range[0].format('YYYY-MM-DD')
    const endDate   = range[1].format('YYYY-MM-DD')
    const search = searchKeyword.trim() || undefined
    const fetchOrders = getPurchaseOrders({ startDate, endDate, search })
    const fetchReturns = getPurchaseReturns({ startDate, endDate, search })
    Promise.all([fetchOrders, fetchReturns])
      .then(([o, r]) => { setOrders(o); setReturns(r) })
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [dateRange, searchKeyword])

  const fetchDetail = useCallback(() => {
    setDetailLoading(true)
    const startDate = dateRange[0].format('YYYY-MM-DD')
    const endDate   = dateRange[1].format('YYYY-MM-DD')
    const search = searchKeyword.trim() || undefined
    getPurchaseOrdersDetail({
      startDate,
      endDate,
      search,
      searchField: search ? searchField : undefined,
    })
      .then(rows => setDetailRows(rows))
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setDetailLoading(false))
  }, [dateRange, searchKeyword, searchField])

  useEffect(() => {
    if (mode === 'summary') fetchAll(dateRange)
    else fetchDetail()
  }, [mode, dateRange, searchKeyword, searchField])

  const handleVoid = async (row: UnifiedRow) => {
    setVoiding(prev => ({ ...prev, [row._key]: true }))
    try {
      if (row.rowType === 'order') await voidPurchaseOrder(row.id)
      else await voidPurchaseReturn(row.id)
      message.success('已作废')
      fetchAll()
    } catch (err) {
      message.error(getErrorMessage(err))
    } finally {
      setVoiding(prev => ({ ...prev, [row._key]: false }))
    }
  }

  const combined: UnifiedRow[] = [
    ...orders.map(toUnified),
    ...returns.map(toUnifiedReturn),
  ].sort((a, b) => b.time.localeCompare(a.time))

  const columns: ColumnsType<UnifiedRow> = [
    { title: '日期', dataIndex: 'date', align: 'center', sorter: (a, b) => a.date.localeCompare(b.date) },
    {
      title: '供应商', align: 'center',
      sorter: (a, b) => a.supplierName.localeCompare(b.supplierName),
      render: (_, r) => `${r.supplierCode} ${r.supplierName}`,
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
      title: '金额', dataIndex: 'amount', align: 'center',
      sorter: (a, b) => a.amount - b.amount,
      render: (v: number, r) => (
        <span style={{ color: r.rowType === 'return' ? '#cf1322' : C_AMOUNT, fontWeight: 600 }}>
          {r.rowType === 'return' ? '-' : ''}¥{v.toLocaleString()}
        </span>
      ),
    },
    {
      title: '件数', dataIndex: 'pieces', align: 'center',
      sorter: (a, b) => a.pieces - b.pieces,
      render: (v: number) => v || '—',
    },
    {
      title: '状态', align: 'center',
      render: (_, r) => {
        if (r.voided) return <Tag color="default">已作废</Tag>
        if (r.rowType === 'return') return <Tag color="default">退货</Tag>
        return <Tag color={STATUS_COLOR[r.status ?? ''] ?? 'default'}>{r.status}</Tag>
      },
    },
    {
      title: '操作', align: 'center',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button type="link" size="small"
            onClick={() => navigate(row.rowType === 'order' ? `/purchase/orders/${row.id}` : `/purchase/returns/${row.id}`)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => navigate(row.rowType === 'order' ? `/purchase/orders/${row.id}/edit` : `/purchase/returns/${row.id}/edit`)} />
          {!row.voided && (
            <Popconfirm
              title="作废此单据？"
              description="作废后数量归零，单据保留，此操作不可撤销"
              okText="确认作废"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleVoid(row)}
            >
              <Button type="link" size="small" danger icon={<StopOutlined />}
                loading={voiding[row._key]} />
            </Popconfirm>
          )}
        </div>
      ),
    },
  ]

  // ——— Detail mode columns ———
  const detailColumns: ColumnsType<PurchaseDetailRow> = [
    { title: '日期',     dataIndex: 'date',         width: 110, align: 'center', sorter: (a, b) => a.date.localeCompare(b.date) },
    {
      title: '供应商', width: 150, align: 'center',
      sorter: (a, b) => a.supplierName.localeCompare(b.supplierName),
      render: (_, r) => `${r.supplierCode} ${r.supplierName}`,
    },
    { title: '单号',     dataIndex: 'no',           width: 175, align: 'center', defaultSortOrder: 'descend', sorter: (a, b) => a.no.localeCompare(b.no) },
    { title: '产品编码', dataIndex: 'productCode',  width: 120, align: 'center', sorter: (a, b) => a.productCode.localeCompare(b.productCode) },
    { title: '产品名称', dataIndex: 'productName',  width: 160, align: 'center', sorter: (a, b) => a.productName.localeCompare(b.productName) },
    { title: '单位',     dataIndex: 'unit',         width: 60,  align: 'center' },
    { title: '数量',     dataIndex: 'qty',          width: 70,  align: 'center', sorter: (a, b) => a.qty - b.qty },
    { title: '单价',     dataIndex: 'unitPrice',    width: 90,  align: 'center', sorter: (a, b) => a.unitPrice - b.unitPrice, render: (v: number) => `¥${v}` },
    {
      title: '金额', dataIndex: 'amount', width: 110, align: 'center',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.amount - b.amount,
      render: (v: number, r) => (
        <span style={{ color: r.rowType === 'return' ? '#cf1322' : C_AMOUNT, fontWeight: 600 }}>
          {r.rowType === 'return' ? '-' : ''}¥{v.toFixed(2)}
        </span>
      ),
    },
    { title: '件数',   dataIndex: 'pieces',   width: 70,  align: 'center', sorter: (a, b) => (a.pieces ?? 0) - (b.pieces ?? 0) },
    { title: '经办人', dataIndex: 'operator', width: 90,  align: 'center', render: (v: string | null) => v ?? '—' },
    { title: '备注',   dataIndex: 'notes',    width: 120, align: 'center', render: (v: string | null) => v ?? '—' },
  ]

  const calcDetailSummary = (rows: PurchaseDetailRow[]) => {
    const orderRows  = rows.filter(r => r.rowType === 'order')
    const returnRows = rows.filter(r => r.rowType === 'return')
    return {
      qty:    orderRows.reduce((s, r) => s + (r.qty    ?? 0), 0) - returnRows.reduce((s, r) => s + (r.qty    ?? 0), 0),
      pieces: orderRows.reduce((s, r) => s + (r.pieces ?? 0), 0) - returnRows.reduce((s, r) => s + (r.pieces ?? 0), 0),
      amount: orderRows.reduce((s, r) => s + (r.amount ?? 0), 0) - returnRows.reduce((s, r) => s + (r.amount ?? 0), 0),
    }
  }

  return (
    <>
      <div className={styles.pageTitle}>采购单据</div>

      <div style={{ marginBottom: 12 }}>
        <Segmented
          options={[{ label: '汇总', value: 'summary' }, { label: '明细', value: 'detail' }]}
          value={mode}
          onChange={v => setMode(v as 'summary' | 'detail')}
        />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Select
            value={searchField}
            onChange={v => setSearchField(v)}
            options={SEARCH_FIELD_OPTIONS}
            style={{ width: 120 }}
          />
          <Input
            placeholder="搜索关键词"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 180 }}
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
          />
          <RangePicker
            value={dateRange}
            presets={[
              { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
              { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
            ]}
            onChange={v => {
              const range: [Dayjs, Dayjs] = v && v[0] && v[1]
                ? [v[0], v[1]]
                : [dayjs().startOf('month'), dayjs().endOf('month')]
              setDateRange(range)
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              const sd = dateRange[0].format('YYYY-MM-DD')
              const ed = dateRange[1].format('YYYY-MM-DD')
              if (mode === 'summary') exportPurchaseOrdersExcel(combined, sd, ed)
              else exportPurchaseOrdersDetailExcel(detailRows, sd, ed)
            }}
          >
            导出
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchase/orders/new')}>
            采购入库
          </Button>
          <Button onClick={() => navigate('/purchase/returns/new')}>
            新增退货
          </Button>
        </div>
      </div>

      {mode === 'summary' ? (
        <Table
          rowKey="_key"
          columns={columns}
          dataSource={combined}
          loading={loading}
          size="middle"
          pagination={{ pageSize: PAGE_SIZE, showTotal: total => `共 ${total} 条` }}
          summary={pageData => {
            const calc = (rows: UnifiedRow[]) => {
              const orderRows  = rows.filter(r => r.rowType === 'order')
              const returnRows = rows.filter(r => r.rowType === 'return')
              return {
                qty:    orderRows.reduce((s, r) => s + (r.qty    ?? 0), 0) - returnRows.reduce((s, r) => s + (r.qty    ?? 0), 0),
                pieces: orderRows.reduce((s, r) => s + (r.pieces ?? 0), 0) - returnRows.reduce((s, r) => s + (r.pieces ?? 0), 0),
                amount: orderRows.reduce((s, r) => s + (r.amount ?? 0), 0) - returnRows.reduce((s, r) => s + (r.amount ?? 0), 0),
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
          scroll={{ x: 1300 }}
          pagination={{ pageSize: PAGE_SIZE, showTotal: total => `共 ${total} 条` }}
          summary={pageData => {
            const page  = calcDetailSummary(pageData as PurchaseDetailRow[])
            const total = calcDetailSummary(detailRows)
            const SummaryRow = ({ label, d, bg }: { label: string; d: typeof page; bg: string }) => (
              <Table.Summary.Row style={{ background: bg, fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={6} align="right">{label}</Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="center">{d.qty}</Table.Summary.Cell>
                <Table.Summary.Cell index={7} />
                <Table.Summary.Cell index={8} align="center">¥{d.amount.toFixed(2)}</Table.Summary.Cell>
                <Table.Summary.Cell index={9} align="center">{d.pieces}</Table.Summary.Cell>
                <Table.Summary.Cell index={10} />
                <Table.Summary.Cell index={11} />
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
    </>
  )
}

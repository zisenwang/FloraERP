import { useEffect, useState } from 'react'
import { Table, DatePicker, Radio, App, Button, Spin, Input, Tag } from 'antd'
import { EyeOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import {
  getSalesGroup, getSalesSubgroup, getSalesOrderRows,
  type ReportGroupRow, type ReportOrderRow,
} from '@/api/reports'
import { getErrorMessage } from '@/utils/error'
import { exportSalesExcel } from '@/utils/exportExcel'
import type { SalesDim } from './SalesReport'
import styles from '../Reports.module.css'

interface Props {
  dateRange: [Dayjs, Dayjs]
  onDateChange: (range: [Dayjs, Dayjs]) => void
  groupBy: SalesDim
  onGroupByChange: (by: SalesDim) => void
  startDate: string
  endDate: string
  l2Cache: Record<number, ReportGroupRow[]>
  setL2Cache: React.Dispatch<React.SetStateAction<Record<number, ReportGroupRow[]>>>
  l3Cache: Record<string, ReportOrderRow[]>
  setL3Cache: React.Dispatch<React.SetStateAction<Record<string, ReportOrderRow[]>>>
  onSelectL1: (row: ReportGroupRow) => void
  onOpenDrawer: (orderId: number) => void
}

export default function SalesReportSummary({
  dateRange, onDateChange, groupBy, onGroupByChange,
  startDate, endDate,
  l2Cache, setL2Cache, l3Cache, setL3Cache,
  onSelectL1, onOpenDrawer,
}: Props) {
  const { message } = App.useApp()
  const navigate = useNavigate()

  const [l1Data, setL1Data] = useState<ReportGroupRow[]>([])
  const [l1Loading, setL1Loading] = useState(false)
  const [l1Search, setL1Search] = useState('')
  const [l2Loading, setL2Loading] = useState<Record<number, boolean>>({})
  const [l3Loading, setL3Loading] = useState<Record<string, boolean>>({})
  const [exporting, setExporting] = useState(false)
  const [exportingId, setExportingId] = useState<number | null>(null)

  useEffect(() => {
    setL1Loading(true)
    setL1Data([])
    getSalesGroup({ by: groupBy, startDate, endDate })
      .then(setL1Data)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setL1Loading(false))
  }, [startDate, endDate, groupBy])

  const filteredL1 = l1Search
    ? l1Data.filter(r => r.name.toLowerCase().includes(l1Search.toLowerCase()))
    : l1Data

  const stats = {
    totalAmount: filteredL1.reduce((s, r) => s + r.totalAmount, 0),
    totalProfit: filteredL1.reduce((s, r) => s + (r.totalProfit ?? 0), 0),
    totalQty:    filteredL1.reduce((s, r) => s + r.totalQty, 0),
    totalPieces: filteredL1.reduce((s, r) => s + r.totalPieces, 0),
    orderCount:  filteredL1.reduce((s, r) => s + r.orderCount, 0),
  }
  const margin = stats.totalAmount
    ? (stats.totalProfit / stats.totalAmount * 100).toFixed(1)
    : null

  // ── Lazy expand handlers ────────────────────────────────────────────────────
  const handleL1Expand = (expanded: boolean, row: ReportGroupRow) => {
    if (!expanded || l2Cache[row.id] !== undefined) return
    setL2Loading(prev => ({ ...prev, [row.id]: true }))
    getSalesSubgroup({ by: groupBy, parentId: row.id, startDate, endDate })
      .then(data => setL2Cache(prev => ({ ...prev, [row.id]: data })))
      .catch(() => setL2Cache(prev => ({ ...prev, [row.id]: [] })))
      .finally(() => setL2Loading(prev => ({ ...prev, [row.id]: false })))
  }

  const handleL2Expand = (expanded: boolean, l1Row: ReportGroupRow, l2Row: ReportGroupRow) => {
    const key = `${l1Row.id}-${l2Row.id}`
    if (!expanded || l3Cache[key] !== undefined) return
    setL3Loading(prev => ({ ...prev, [key]: true }))
    const params: Parameters<typeof getSalesOrderRows>[0] = { startDate, endDate }
    if (groupBy === 'customer') { params.customerId = l1Row.id; params.productId = l2Row.id }
    else if (groupBy === 'product') { params.productId = l1Row.id; params.customerId = l2Row.id }
    else { params.supplierId = l1Row.id; params.productId = l2Row.id }
    getSalesOrderRows(params)
      .then(data => setL3Cache(prev => ({ ...prev, [key]: data })))
      .catch(() => setL3Cache(prev => ({ ...prev, [key]: [] })))
      .finally(() => setL3Loading(prev => ({ ...prev, [key]: false })))
  }

  // ── Export handlers ─────────────────────────────────────────────────────────
  const handleExport = () => {
    setExporting(true)
    getSalesOrderRows({ startDate, endDate })
      .then(rows => exportSalesExcel(rows, startDate, endDate))
      .catch(() => message.error('导出失败'))
      .finally(() => setExporting(false))
  }

  const handleExportL1 = (row: ReportGroupRow) => {
    setExportingId(row.id)
    const params: Parameters<typeof getSalesOrderRows>[0] = { startDate, endDate }
    if (groupBy === 'customer') params.customerId = row.id
    else if (groupBy === 'product') params.productId = row.id
    else params.supplierId = row.id
    getSalesOrderRows(params)
      .then(rows => exportSalesExcel(rows, startDate, endDate, row.name))
      .catch(() => message.error('导出失败'))
      .finally(() => setExportingId(null))
  }

  // ── Labels ──────────────────────────────────────────────────────────────────
  const l1Label = groupBy === 'customer' ? '客户' : groupBy === 'product' ? '货品' : '供应商'
  const l2Label = groupBy === 'customer' ? '货品' : groupBy === 'product' ? '客户' : '货品'

  // ── Columns ─────────────────────────────────────────────────────────────────
  const l3Columns: ColumnsType<ReportOrderRow> = [
    {
      title: '单号', dataIndex: 'orderNo', width: 190,
      render: (v: string, r: ReportOrderRow) => (
        <span>
          {r.isReturn ? <Tag color="orange" style={{ marginRight: 4 }}>退</Tag> : null}
          <Button type="link" size="small" style={{ padding: 0 }}
            onClick={() => r.isReturn ? navigate(`/sales/returns/${r.orderId}`) : onOpenDrawer(r.orderId)}>
            {v}
          </Button>
        </span>
      ),
    },
    { title: '日期', dataIndex: 'orderDate', width: 100 },
    { title: '数量', dataIndex: 'qty', width: 70, align: 'center' },
    { title: '件数', dataIndex: 'pieces', width: 70, align: 'center', render: v => v || '—' },
    { title: '单价', dataIndex: 'unitPrice', width: 85, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '折后金额', dataIndex: 'finalAmount', width: 95, align: 'right',
      render: (v: number, r: ReportOrderRow) => (
        <span style={{ color: r.isReturn ? '#cf1322' : undefined }}>¥{v.toFixed(2)}</span>
      ),
    },
    { title: '成本价', dataIndex: 'costPrice', width: 85, align: 'right', render: (v: number | null) => v != null ? `¥${v.toFixed(2)}` : '—' },
    {
      title: '利润', dataIndex: 'profit', width: 90, align: 'right',
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#389e0d' : '#cf1322', fontWeight: 500 }}>
          {v >= 0 ? '+' : ''}¥{v.toFixed(2)}
        </span>
      ),
    },
  ]

  const l2Columns: ColumnsType<ReportGroupRow> = [
    { title: l2Label, dataIndex: 'name', width: 200 },
    { title: '订单数', dataIndex: 'orderCount', width: 80, align: 'center' },
    { title: '数量', dataIndex: 'totalQty', width: 80, align: 'center' },
    { title: '金额', dataIndex: 'totalAmount', width: 110, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '件数', dataIndex: 'totalPieces', width: 75, align: 'center', render: v => v || '—' },
    {
      title: '毛利', dataIndex: 'totalProfit', width: 110, align: 'right',
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#389e0d' : '#cf1322' }}>
          {v >= 0 ? '+' : ''}¥{v.toFixed(2)}
        </span>
      ),
    },
  ]

  const makeL2Expandable = (l1Row: ReportGroupRow) => ({
    expandedRowRender: (l2Row: ReportGroupRow) => {
      const key = `${l1Row.id}-${l2Row.id}`
      if (l3Loading[key]) return <Spin size="small" style={{ display: 'block', padding: 12 }} />
      return (
        <Table rowKey="orderNo" size="small" pagination={false}
          dataSource={l3Cache[key] ?? []} columns={l3Columns} scroll={{ x: 950 }} />
      )
    },
    onExpand: (expanded: boolean, l2Row: ReportGroupRow) => handleL2Expand(expanded, l1Row, l2Row),
  })

  const l1Columns: ColumnsType<ReportGroupRow> = [
    { title: l1Label, dataIndex: 'name', width: 220 },
    { title: '订单数', dataIndex: 'orderCount', width: 80, align: 'center' },
    { title: '数量', dataIndex: 'totalQty', width: 80, align: 'center' },
    { title: '金额', dataIndex: 'totalAmount', width: 120, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '件数', dataIndex: 'totalPieces', width: 75, align: 'center', render: v => v || '—' },
    {
      title: '毛利', dataIndex: 'totalProfit', width: 120, align: 'right',
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#389e0d' : '#cf1322', fontWeight: 500 }}>
          {v >= 0 ? '+' : ''}¥{v.toFixed(2)}
        </span>
      ),
    },
    {
      title: '毛利率', width: 90, align: 'right',
      render: (_: unknown, r: ReportGroupRow) => {
        if (!r.totalAmount || !r.totalProfit) return '—'
        const pct = (r.totalProfit / r.totalAmount * 100).toFixed(1)
        return <span style={{ color: Number(pct) >= 0 ? '#389e0d' : '#cf1322' }}>{pct}%</span>
      },
    },
    {
      title: '', width: 120, align: 'center', fixed: 'right',
      render: (_: unknown, r: ReportGroupRow) => (
        <span style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => onSelectL1(r)}>查看</Button>
          <Button size="small" type="link" icon={<DownloadOutlined />}
            loading={exportingId === r.id} onClick={() => handleExportL1(r)}>导出</Button>
        </span>
      ),
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>销售报表</div>

      <div className={styles.toolbar} style={{ flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={v => v && onDateChange(v as [Dayjs, Dayjs])}
          presets={[
            { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
            { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
          ]}
        />
        <Radio.Group value={groupBy} onChange={e => onGroupByChange(e.target.value)}
          optionType="button" buttonStyle="solid"
          options={[
            { label: '按客户汇总', value: 'customer' },
            { label: '按货品汇总', value: 'product' },
            { label: '按供应商汇总', value: 'supplier' },
          ]}
        />
        <Input prefix={<SearchOutlined />} placeholder={`搜索${l1Label}名称/编码`}
          allowClear style={{ width: 220 }} value={l1Search}
          onChange={e => setL1Search(e.target.value)} />
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>导出Excel</Button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>销售总额</div>
          <div className={styles.statValue}>¥{stats.totalAmount.toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>合计毛利</div>
          <div className={stats.totalProfit >= 0 ? styles.statValueGreen : styles.statValueRed}>
            {stats.totalProfit >= 0 ? '+' : ''}¥{stats.totalProfit.toFixed(2)}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>毛利率</div>
          <div className={margin !== null && Number(margin) >= 0 ? styles.statValueGreen : styles.statValueRed}>
            {margin !== null ? `${margin}%` : '—'}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>总数量</div>
          <div className={styles.statValue}>{stats.totalQty}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>总件数</div>
          <div className={styles.statValue}>{stats.totalPieces || '—'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>订单数</div>
          <div className={styles.statValue}>{stats.orderCount}</div>
        </div>
      </div>

      <Table
        rowKey="id" size="small" loading={l1Loading}
        dataSource={filteredL1} columns={l1Columns}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
        scroll={{ x: 800 }}
        expandable={{
          onExpand: handleL1Expand,
          expandedRowRender: (l1Row: ReportGroupRow) => {
            if (l2Loading[l1Row.id]) return <Spin size="small" style={{ display: 'block', padding: 12 }} />
            return (
              <Table rowKey="id" size="small" pagination={false}
                dataSource={l2Cache[l1Row.id] ?? []} columns={l2Columns}
                scroll={{ x: 700 }} expandable={makeL2Expandable(l1Row)} />
            )
          },
        }}
      />
    </>
  )
}

import { useEffect, useState } from 'react'
import { Table, DatePicker, Radio, App, Button, Input } from 'antd'
import { EyeOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import {
  getSalesGroup, getSalesOrderRows,
  type ReportGroupRow,
} from '@/api/reports'
import { getErrorMessage } from '@/utils/error'
import { exportSalesExcel } from '@/utils/exportExcel'
import { C_AMOUNT, C_LABEL } from '@/constants/colors'
import type { SalesDim } from './SalesReport'
import styles from '../Reports.module.css'

interface Props {
  dateRange: [Dayjs, Dayjs]
  onDateChange: (range: [Dayjs, Dayjs]) => void
  groupBy: SalesDim
  onGroupByChange: (by: SalesDim) => void
  startDate: string
  endDate: string
  onSelectL1: (row: ReportGroupRow) => void
  onOpenDrawer: (orderId: number) => void
}

export default function SalesReportSummary({
  dateRange, onDateChange, groupBy, onGroupByChange,
  startDate, endDate,
  onSelectL1, onOpenDrawer,
}: Props) {
  const { message } = App.useApp()

  const [l1Data, setL1Data] = useState<ReportGroupRow[]>([])
  const [l1Loading, setL1Loading] = useState(false)
  const [l1Search, setL1Search] = useState('')
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

  // ── Columns ─────────────────────────────────────────────────────────────────
  const l1Columns: ColumnsType<ReportGroupRow> = [
    { title: l1Label, dataIndex: 'name', width: 220, render: (v: string) => <span style={{ color: C_LABEL }}>{v}</span> },
    { title: '订单数', dataIndex: 'orderCount', width: 80, align: 'center' },
    { title: '数量', dataIndex: 'totalQty', width: 80, align: 'center' },
    { title: '金额', dataIndex: 'totalAmount', width: 120, align: 'right', render: (v: number) => <span style={{ color: C_AMOUNT, fontWeight: 600 }}>¥{v.toFixed(2)}</span> },
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
      />
    </>
  )
}

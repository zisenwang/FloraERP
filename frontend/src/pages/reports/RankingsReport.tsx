import { useEffect, useState } from 'react'
import { Table, DatePicker, App, Tabs, Segmented, Spin } from 'antd'
import { TableOutlined, BarChartOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import {
  ComposedChart, BarChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  getRankings,
  type ReportGroupRow,
  type SalesRankDim,
  type PurchaseRankDim,
} from '@/api/reports'
import { getErrorMessage } from '@/utils/error'
import { C_AMOUNT, C_LABEL } from '@/constants/colors'
import styles from './Reports.module.css'

const SALES_TABS: { key: SalesRankDim; label: string }[] = [
  { key: 'customer', label: '客户排行' },
  { key: 'product',  label: '货品排行' },
  { key: 'supplier', label: '供应商排行' },
  { key: 'daily',    label: '日排行' },
  { key: 'monthly',  label: '月度排行' },
]

const PURCHASE_TABS: { key: PurchaseRankDim; label: string }[] = [
  { key: 'product',  label: '货品排行' },
  { key: 'supplier', label: '供应商排行' },
]

const FMT = (v: number) =>
  `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

// ── Monthly table helpers ────────────────────────────────────────────────────

type MonthlyRow = ReportGroupRow & {
  _isSubtotal?: boolean
  _year: string
  _month: string
  _rowSpan: number
}

function buildMonthlyTable(rows: ReportGroupRow[]): MonthlyRow[] {
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name))

  const byYear = new Map<string, ReportGroupRow[]>()
  for (const r of sorted) {
    const year = r.name.slice(0, 4)
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(r)
  }

  const result: MonthlyRow[] = []
  for (const [year, yearRows] of byYear) {
    const span = yearRows.length + 1 // months + subtotal row
    yearRows.forEach((r, idx) => {
      result.push({
        ...r,
        _year: year,
        _month: r.name.slice(5, 7),
        _rowSpan: idx === 0 ? span : 0,
      })
    })
    // Subtotal row
    result.push({
      name: `${year}-subtotal`,
      id: 0,
      orderCount:   yearRows.reduce((s, r) => s + (r.orderCount  ?? 0), 0),
      totalQty:     yearRows.reduce((s, r) => s + r.totalQty,           0),
      totalPieces:  yearRows.reduce((s, r) => s + (r.totalPieces ?? 0), 0),
      totalAmount:  yearRows.reduce((s, r) => s + r.totalAmount,         0),
      totalProfit:  yearRows.reduce((s, r) => s + (r.totalProfit ?? 0), 0),
      _isSubtotal: true,
      _year: year,
      _month: '小计',
      _rowSpan: 0,
    })
  }
  return result
}

// ── Custom XAxis tick for monthly chart (shows year below month when it changes) ──

function MonthTick({ x, y, payload, chartData }: {
  x: number | string; y: number | string
  payload: { value: string }
  chartData: ReportGroupRow[]
}) {
  const nx = Number(x); const ny = Number(y)
  const name  = payload.value        // "2026-01"
  const month = name.slice(5, 7)
  const year  = name.slice(0, 4)
  const idx   = chartData.findIndex(d => d.name === name)
  const showYear = idx === 0 || chartData[idx - 1]?.name.slice(0, 4) !== year

  return (
    <g transform={`translate(${nx},${ny})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#555" fontSize={12}>{month}</text>
      {showYear && (
        <text x={0} y={0} dy={30} textAnchor="middle" fill="#444" fontSize={13} fontWeight={600}>{year}</text>
      )}
    </g>
  )
}

// ────────────────────────────────────────────────────────────────────────────

export default function RankingsReport() {
  const { message } = App.useApp()
  const [searchParams] = useSearchParams()

  const initType = (searchParams.get('type') ?? 'sales') as 'sales' | 'purchase'
  const initBy   = searchParams.get('by') ?? 'customer'

  const [orderType, setOrderType] = useState<'sales' | 'purchase'>(initType)
  const [by, setBy] = useState<string>(initBy)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])
  const [rows, setRows] = useState<ReportGroupRow[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')

  useEffect(() => {
    setLoading(true)
    setRows([])
    const startDate = dateRange[0].format('YYYY-MM-DD')
    const endDate   = dateRange[1].format('YYYY-MM-DD')
    getRankings({ type: orderType, by: by as SalesRankDim, startDate, endDate })
      .then(setRows)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [orderType, by, dateRange])

  const handleTypeChange = (key: string) => {
    const t = key as 'sales' | 'purchase'
    setOrderType(t)
    setBy(t === 'sales' ? 'customer' : 'product')
    setViewMode('table')
  }

  const handleByChange = (key: string) => {
    setBy(key)
    setViewMode('table')
    if (key === 'monthly') {
      setDateRange([dayjs().startOf('year'), dayjs().endOf('year')])
    } else if (by === 'monthly') {
      setDateRange([dayjs().startOf('month'), dayjs().endOf('month')])
    }
  }

  const isSales    = orderType === 'sales'
  const isTimeDim  = by === 'daily' || by === 'monthly'
  const isMonthly  = by === 'monthly'
  const nameLabel  = by === 'daily' ? '日期' : by === 'monthly' ? '月份' : '名称'

  // Chart data sorted chronologically for time dims
  const chartData = isTimeDim
    ? [...rows].sort((a, b) => a.name.localeCompare(b.name))
    : rows

  const totalAmount = rows.reduce((s, r) => s + r.totalAmount, 0)
  const totalQty    = rows.reduce((s, r) => s + r.totalQty, 0)

  // ── Columns ────────────────────────────────────────────────────────────────

  // Monthly columns — year rowSpan + month + data cols + yearly subtotal styling
  const monthlyColumns: ColumnsType<MonthlyRow> = [
    {
      title: '年份', width: 70,
      onCell: (r) => ({ rowSpan: r._rowSpan }),
      render: (_: unknown, r: MonthlyRow) => <strong>{r._year}</strong>,
    },
    {
      title: '月份', width: 65,
      render: (_: unknown, r: MonthlyRow) =>
        r._isSubtotal
          ? <strong style={{ color: '#555' }}>小计</strong>
          : r._month,
    },
    {
      title: '订单数', dataIndex: 'orderCount', align: 'center', width: 80,
      render: (v: number, r: MonthlyRow) =>
        r._isSubtotal ? <strong>{v || 0}</strong> : (v || '—'),
    },
    {
      title: isSales ? '销售数量' : '进货数量', dataIndex: 'totalQty', align: 'center', width: 90,
      render: (v: number, r: MonthlyRow) =>
        r._isSubtotal ? <strong>{v}</strong> : v,
    },
    {
      title: '件数', dataIndex: 'totalPieces', align: 'center', width: 70,
      render: (v: number, r: MonthlyRow) =>
        r._isSubtotal ? <strong>{v || 0}</strong> : (v || '—'),
    },
    {
      title: isSales ? '销售金额' : '进货金额', dataIndex: 'totalAmount', align: 'right', width: 120,
      render: (v: number, r: MonthlyRow) =>
        r._isSubtotal
          ? <strong style={{ color: C_AMOUNT }}>¥{v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong>
          : <span style={{ color: C_AMOUNT }}>¥{v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>,
    },
  ]

  // Standard columns (non-monthly)
  const standardColumns: ColumnsType<ReportGroupRow> = [
    {
      title: '排名', key: 'rank', align: 'center', width: 60,
      render: (_: unknown, __: unknown, i: number) => <span style={{ fontWeight: 600 }}>{`#${i + 1}`}</span>,
    },
    {
      title: nameLabel, dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (v: string) => <span style={{ color: C_LABEL, fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '订单数', dataIndex: 'orderCount', align: 'center',
      sorter: (a, b) => (a.orderCount ?? 0) - (b.orderCount ?? 0),
      render: (v: number) => v || '—',
    },
    {
      title: isSales ? '销售数量' : '进货数量', dataIndex: 'totalQty', align: 'center',
      sorter: (a, b) => a.totalQty - b.totalQty,
    },
    {
      title: '件数', dataIndex: 'totalPieces', align: 'center',
      sorter: (a, b) => (a.totalPieces ?? 0) - (b.totalPieces ?? 0),
      render: (v: number) => v || '—',
    },
    {
      title: isSales ? '销售金额' : '进货金额', dataIndex: 'totalAmount', align: 'right',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.totalAmount - b.totalAmount,
      render: (v: number) => <strong style={{ color: C_AMOUNT }}>¥{v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong>,
    },
  ]

  const monthlyDisplayRows = isMonthly ? buildMonthlyTable(rows) : []

  return (
    <>
      <div className={styles.pageTitle}>
        排行榜
      </div>

      <Tabs
        activeKey={orderType}
        onChange={handleTypeChange}
        items={[
          { key: 'sales', label: '销售排行' },
          { key: 'purchase', label: '采购排行' },
        ]}
        style={{ display: 'inline-block', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Tabs
          activeKey={by}
          onChange={handleByChange}
          size="small"
          items={isSales ? SALES_TABS : PURCHASE_TABS}
          style={{ marginBottom: 0 }}
        />
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
          {isTimeDim && (
            <Segmented
              value={viewMode}
              onChange={v => setViewMode(v as 'table' | 'chart')}
              options={[
                { value: 'table', icon: <TableOutlined /> },
                { value: 'chart', icon: <BarChartOutlined /> },
              ]}
            />
          )}
          {isMonthly ? (
            <DatePicker.RangePicker
              picker="year"
              value={dateRange}
              onChange={v => v && setDateRange([v[0]!.startOf('year'), v[1]!.endOf('year')])}
              presets={[
                { label: '今年',   value: [dayjs().startOf('year'), dayjs().endOf('year')] },
                { label: '去年',   value: [dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year')] },
                { label: '近两年', value: [dayjs().subtract(1, 'year').startOf('year'), dayjs().endOf('year')] },
              ]}
            />
          ) : (
            <DatePicker.RangePicker
              value={dateRange}
              onChange={v => v && setDateRange(v as [Dayjs, Dayjs])}
              presets={[
                { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                { label: '本年', value: [dayjs().startOf('year'), dayjs().endOf('year')] },
              ]}
            />
          )}
        </div>
      </div>

      <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
        共 {rows.length} 条 · 合计金额 <strong>¥{totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong>
        &emsp;合计数量 <strong>{totalQty}</strong>
      </div>

      {loading ? (
        <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />
      ) : viewMode === 'chart' && isTimeDim ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#333' }}>
              {isSales ? '销售金额' : '进货金额'}趋势
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 24, bottom: isMonthly ? 20 : 4, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={isMonthly
                    ? (props) => <MonthTick {...props} chartData={chartData} />
                    : { fontSize: 12 }
                  }
                  height={isMonthly ? 50 : 30}
                />
                <YAxis tickFormatter={FMT} tick={{ fontSize: 12 }} width={80} />
                <Tooltip formatter={(v) => [`¥${Number(v ?? 0).toLocaleString()}`, isSales ? '销售金额' : '进货金额']} />
                <Bar dataKey="totalAmount" name={isSales ? '销售金额' : '进货金额'} fill="#4096ff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#333' }}>
              {isSales ? '销售数量' : '进货数量'} / 件数趋势
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 48, bottom: isMonthly ? 20 : 4, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={isMonthly
                    ? (props) => <MonthTick {...props} chartData={chartData} />
                    : { fontSize: 12 }
                  }
                  height={isMonthly ? 50 : 30}
                />
                <YAxis yAxisId="qty" orientation="left" tick={{ fontSize: 12 }}
                  label={{ value: isSales ? '销售数量' : '进货数量', angle: -90, position: 'insideLeft', offset: -4, style: { fontSize: 11, fill: '#52c41a' } }}
                />
                <YAxis yAxisId="pieces" orientation="right" tick={{ fontSize: 12 }}
                  label={{ value: '件数', angle: 90, position: 'insideRight', offset: -4, style: { fontSize: 11, fill: '#faad14' } }}
                />
                <Tooltip />
                <Legend />
                <Bar yAxisId="pieces" dataKey="totalPieces" name="件数" fill="#faad14" opacity={0.7} radius={[3, 3, 0, 0]} />
                <Line yAxisId="qty" type="monotone" dataKey="totalQty" name={isSales ? '销售数量' : '进货数量'}
                  stroke="#52c41a" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#333' }}>订单数趋势</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 24, bottom: isMonthly ? 20 : 4, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={isMonthly
                    ? (props) => <MonthTick {...props} chartData={chartData} />
                    : { fontSize: 12 }
                  }
                  height={isMonthly ? 50 : 30}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [Number(v), '订单数']} />
                <Bar dataKey="orderCount" name="订单数" fill="#722ed1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : isMonthly ? (
        <Table
          rowKey="name"
          columns={monthlyColumns as ColumnsType<object>}
          dataSource={monthlyDisplayRows}
          loading={loading}
          size="middle"
          pagination={false}
          onRow={(r) => (r as MonthlyRow)._isSubtotal
            ? { style: { background: '#fafafa', fontWeight: 600, borderTop: '1px solid #e8e8e8' } }
            : {}
          }
        />
      ) : (
        <Table
          rowKey="name"
          columns={standardColumns}
          dataSource={rows}
          loading={loading}
          size="middle"
          pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        />
      )}
    </>
  )
}

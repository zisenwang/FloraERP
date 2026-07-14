import { useEffect, useState } from 'react'
import { Table, DatePicker, App, Tabs, Segmented, Spin } from 'antd'
import { TrophyOutlined, TableOutlined, BarChartOutlined } from '@ant-design/icons'
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
import styles from './Reports.module.css'

const MEDAL = ['🥇', '🥈', '🥉']

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
      .then(data => {
        // For time dims keep chronological order in chart; table can be re-sorted
        setRows(data)
      })
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
  }

  const isSales   = orderType === 'sales'
  const isTimeDim = by === 'daily' || by === 'monthly'
  const nameLabel = by === 'daily' ? '日期' : by === 'monthly' ? '月份' : '名称'

  const columns: ColumnsType<ReportGroupRow> = [
    {
      title: '排名', key: 'rank', align: 'center',
      render: (_: unknown, __: unknown, i: number) => (
        <span style={{ fontWeight: 600 }}>
          {i < 3 ? MEDAL[i] : `#${i + 1}`}
        </span>
      ),
    },
    {
      title: nameLabel,
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '订单数', dataIndex: 'orderCount', align: 'center',
      sorter: (a, b) => (a.orderCount ?? 0) - (b.orderCount ?? 0),
      render: (v: number) => v || '—',
    },
    {
      title: isSales ? '销售数量' : '进货数量',
      dataIndex: 'totalQty', align: 'center',
      sorter: (a, b) => a.totalQty - b.totalQty,
    },
    {
      title: '件数', dataIndex: 'totalPieces', align: 'center',
      sorter: (a, b) => (a.totalPieces ?? 0) - (b.totalPieces ?? 0),
      render: (v: number) => v || '—',
    },
    {
      title: isSales ? '销售金额' : '进货金额',
      dataIndex: 'totalAmount', align: 'right',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.totalAmount - b.totalAmount,
      render: (v: number) => <strong>¥{v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong>,
    },
    ...(isSales && !isTimeDim ? [{
      title: '毛利',
      dataIndex: 'totalProfit',
      align: 'right' as const,
      sorter: (a: ReportGroupRow, b: ReportGroupRow) => (a.totalProfit ?? 0) - (b.totalProfit ?? 0),
      render: (v: number | undefined) => {
        if (v == null) return '—'
        return (
          <span style={{ color: v >= 0 ? '#389e0d' : '#cf1322', fontWeight: 500 }}>
            {v >= 0 ? '+' : ''}¥{v.toFixed(2)}
          </span>
        )
      },
    }] : []),
    ...(isSales && !isTimeDim ? [{
      title: '毛利率',
      key: 'margin',
      align: 'right' as const,
      sorter: (a: ReportGroupRow, b: ReportGroupRow) => {
        const ra = a.totalAmount ? (a.totalProfit ?? 0) / a.totalAmount : 0
        const rb = b.totalAmount ? (b.totalProfit ?? 0) / b.totalAmount : 0
        return ra - rb
      },
      render: (_: unknown, r: ReportGroupRow) => {
        if (!r.totalAmount || r.totalProfit == null) return '—'
        const pct = (r.totalProfit / r.totalAmount * 100).toFixed(1)
        return (
          <span style={{ color: Number(pct) >= 0 ? '#389e0d' : '#cf1322' }}>
            {pct}%
          </span>
        )
      },
    }] : []),
  ]

  // Chart data sorted chronologically for time dims
  const chartData = isTimeDim
    ? [...rows].sort((a, b) => a.name.localeCompare(b.name))
    : rows

  const totalAmount = rows.reduce((s, r) => s + r.totalAmount, 0)
  const totalQty    = rows.reduce((s, r) => s + r.totalQty, 0)

  return (
    <>
      <div className={styles.pageTitle}>
        <TrophyOutlined style={{ marginRight: 8 }} />
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
          <DatePicker.RangePicker
            value={dateRange}
            onChange={v => v && setDateRange(v as [Dayjs, Dayjs])}
            presets={[
              { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
              { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
              { label: '本年', value: [dayjs().startOf('year'), dayjs().endOf('year')] },
            ]}
          />
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
          {/* Amount bar chart */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#333' }}>
              {isSales ? '销售金额' : '进货金额'}趋势
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 24, bottom: 4, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={FMT} tick={{ fontSize: 12 }} width={80} />
                <Tooltip formatter={(v: number) => [`¥${v.toLocaleString()}`, isSales ? '销售金额' : '进货金额']} />
                <Bar dataKey="totalAmount" name={isSales ? '销售金额' : '进货金额'} fill="#4096ff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Qty (line, left axis) + pieces (bar, right axis) combined chart */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#333' }}>
              {isSales ? '销售数量' : '进货数量'} / 件数趋势
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 48, bottom: 4, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="qty"
                  orientation="left"
                  tick={{ fontSize: 12 }}
                  label={{ value: isSales ? '销售数量' : '进货数量', angle: -90, position: 'insideLeft', offset: -4, style: { fontSize: 11, fill: '#52c41a' } }}
                />
                <YAxis
                  yAxisId="pieces"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  label={{ value: '件数', angle: 90, position: 'insideRight', offset: -4, style: { fontSize: 11, fill: '#faad14' } }}
                />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="pieces"
                  dataKey="totalPieces"
                  name="件数"
                  fill="#faad14"
                  opacity={0.7}
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  yAxisId="qty"
                  type="monotone"
                  dataKey="totalQty"
                  name={isSales ? '销售数量' : '进货数量'}
                  stroke="#52c41a"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Order count bar */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#333' }}>订单数趋势</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 24, bottom: 4, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [v, '订单数']} />
                <Bar dataKey="orderCount" name="订单数" fill="#722ed1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <Table
          rowKey="name"
          columns={columns}
          dataSource={rows}
          loading={loading}
          size="middle"
          pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        />
      )}
    </>
  )
}

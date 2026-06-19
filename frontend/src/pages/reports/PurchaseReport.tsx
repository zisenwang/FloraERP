import { useEffect, useState } from 'react'
import { Table, DatePicker, Radio, App, Button, Spin, Input } from 'antd'
import { EyeOutlined, ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import {
  getPurchaseGroup, getPurchaseSubgroup, getPurchaseOrderRows,
  type ReportGroupRow, type ReportOrderRow,
} from '@/api/reports'
import { getErrorMessage } from '@/utils/error'
import PurchaseOrderDrawer from '@/components/PurchaseOrderDrawer'
import styles from './Reports.module.css'

type PurchaseDim = 'supplier' | 'product'

export default function PurchaseReport() {
  const { message } = App.useApp()

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'), dayjs().endOf('month'),
  ])
  const [groupBy, setGroupBy] = useState<PurchaseDim>('supplier')
  const [l1Data, setL1Data] = useState<ReportGroupRow[]>([])
  const [l1Loading, setL1Loading] = useState(false)
  const [l1Search, setL1Search] = useState('')
  const [l2Cache, setL2Cache] = useState<Record<number, ReportGroupRow[]>>({})
  const [l2Loading, setL2Loading] = useState<Record<number, boolean>>({})
  const [l3Cache, setL3Cache] = useState<Record<string, ReportOrderRow[]>>({})
  const [l3Loading, setL3Loading] = useState<Record<string, boolean>>({})

  // Order detail drawer
  const [drawerOrderId, setDrawerOrderId] = useState<number | null>(null)

  // Detail view
  const [selectedL1, setSelectedL1] = useState<ReportGroupRow | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailExpandedKeys, setDetailExpandedKeys] = useState<number[]>([])

  const startDate = dateRange[0].format('YYYY-MM-DD')
  const endDate = dateRange[1].format('YYYY-MM-DD')

  const loadL1 = () => {
    setL1Loading(true)
    setL1Data([])
    setL2Cache({})
    setL3Cache({})
    setSelectedL1(null)
    setDetailExpandedKeys([])
    getPurchaseGroup({ by: groupBy, startDate, endDate })
      .then(setL1Data)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setL1Loading(false))
  }

  useEffect(() => { loadL1() }, [dateRange, groupBy])

  // Client-side filter
  const filteredL1 = l1Search
    ? l1Data.filter(r => r.name.toLowerCase().includes(l1Search.toLowerCase()))
    : l1Data

  // Stats computed from visible rows
  const filteredStats = {
    totalAmount: filteredL1.reduce((s, r) => s + r.totalAmount, 0),
    totalQty: filteredL1.reduce((s, r) => s + r.totalQty, 0),
    totalPieces: filteredL1.reduce((s, r) => s + r.totalPieces, 0),
    orderCount: filteredL1.reduce((s, r) => s + r.orderCount, 0),
  }

  // ── Lazy L2 expand (list view) ──────────────────────────────────────────────
  const handleL1Expand = (expanded: boolean, row: ReportGroupRow) => {
    if (!expanded || l2Cache[row.id] !== undefined) return
    setL2Loading(prev => ({ ...prev, [row.id]: true }))
    getPurchaseSubgroup({ by: groupBy, parentId: row.id, startDate, endDate })
      .then(data => setL2Cache(prev => ({ ...prev, [row.id]: data })))
      .catch(() => setL2Cache(prev => ({ ...prev, [row.id]: [] })))
      .finally(() => setL2Loading(prev => ({ ...prev, [row.id]: false })))
  }

  const handleL2Expand = (expanded: boolean, l1Row: ReportGroupRow, l2Row: ReportGroupRow) => {
    const key = `${l1Row.id}-${l2Row.id}`
    if (!expanded || l3Cache[key] !== undefined) return
    setL3Loading(prev => ({ ...prev, [key]: true }))
    const params: Parameters<typeof getPurchaseOrderRows>[0] = { startDate, endDate }
    if (groupBy === 'supplier') { params.supplierId = l1Row.id; params.productId = l2Row.id }
    else { params.productId = l1Row.id; params.supplierId = l2Row.id }
    getPurchaseOrderRows(params)
      .then(data => setL3Cache(prev => ({ ...prev, [key]: data })))
      .catch(() => setL3Cache(prev => ({ ...prev, [key]: [] })))
      .finally(() => setL3Loading(prev => ({ ...prev, [key]: false })))
  }

  // ── 查看: load all L2+L3 → detail view ────────────────────────────────────
  const handleViewL1 = async (row: ReportGroupRow) => {
    setSelectedL1(row)
    setDetailLoading(true)
    try {
      let l2List = l2Cache[row.id]
      if (!l2List) {
        l2List = await getPurchaseSubgroup({ by: groupBy, parentId: row.id, startDate, endDate })
        setL2Cache(prev => ({ ...prev, [row.id]: l2List! }))
      }
      const results = await Promise.allSettled(
        l2List.map(async l2Row => {
          const key = `${row.id}-${l2Row.id}`
          const params: Parameters<typeof getPurchaseOrderRows>[0] = { startDate, endDate }
          if (groupBy === 'supplier') { params.supplierId = row.id; params.productId = l2Row.id }
          else { params.productId = row.id; params.supplierId = l2Row.id }
          const data = await getPurchaseOrderRows(params)
          return { key, data }
        })
      )
      const newL3: Record<string, ReportOrderRow[]> = {}
      results.forEach(r => { if (r.status === 'fulfilled') newL3[r.value.key] = r.value.data })
      setL3Cache(prev => ({ ...prev, ...newL3 }))
      setDetailExpandedKeys(l2List.map(r => r.id))
    } catch {
      message.error('加载详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  // ── Columns ────────────────────────────────────────────────────────────────
  const l3Columns: ColumnsType<ReportOrderRow> = [
    { title: '单号', dataIndex: 'orderNo', width: 180 },
    { title: '日期', dataIndex: 'orderDate', width: 100 },
    { title: '数量', dataIndex: 'qty', width: 70, align: 'center' },
    { title: '件数', dataIndex: 'pieces', width: 70, align: 'center', render: v => v || '—' },
    { title: '单价', dataIndex: 'unitPrice', width: 85, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '原价小计', dataIndex: 'amount', width: 95, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '折扣', dataIndex: 'discount', width: 65, align: 'center', render: (v: number) => `${v}%` },
    {
      title: '折后金额', dataIndex: 'finalAmount', width: 95, align: 'right',
      render: (v: number) => <span style={{ color: '#389e0d' }}>¥{v.toFixed(2)}</span>,
    },
    {
      title: '', width: 60, align: 'center',
      render: (_: unknown, r: ReportOrderRow) => (
        <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => setDrawerOrderId(r.orderId)}>
          查看
        </Button>
      ),
    },
  ]

  const makeL2Expandable = (l1Row: ReportGroupRow) => ({
    expandedRowRender: (l2Row: ReportGroupRow) => {
      const key = `${l1Row.id}-${l2Row.id}`
      if (l3Loading[key]) return <Spin size="small" style={{ display: 'block', padding: 12 }} />
      return (
        <Table rowKey="orderNo" size="small" pagination={false}
          dataSource={l3Cache[key] ?? []} columns={l3Columns} scroll={{ x: 800 }} />
      )
    },
    onExpand: (expanded: boolean, l2Row: ReportGroupRow) => handleL2Expand(expanded, l1Row, l2Row),
  })

  const l2LabelTitle = groupBy === 'supplier' ? '货品' : '供应商'
  const l1LabelTitle = groupBy === 'supplier' ? '供应商' : '货品'

  const l2Columns = (): ColumnsType<ReportGroupRow> => [
    { title: l2LabelTitle, dataIndex: 'name', width: 200 },
    { title: '订单数', dataIndex: 'orderCount', width: 80, align: 'center' },
    { title: '数量', dataIndex: 'totalQty', width: 80, align: 'center' },
    { title: '件数', dataIndex: 'totalPieces', width: 75, align: 'center', render: v => v || '—' },
    { title: '金额', dataIndex: 'totalAmount', width: 120, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
  ]

  const l1Columns: ColumnsType<ReportGroupRow> = [
    { title: l1LabelTitle, dataIndex: 'name', width: 220 },
    { title: '订单数', dataIndex: 'orderCount', width: 80, align: 'center' },
    { title: '数量', dataIndex: 'totalQty', width: 80, align: 'center' },
    { title: '件数', dataIndex: 'totalPieces', width: 75, align: 'center', render: v => v || '—' },
    { title: '金额', dataIndex: 'totalAmount', width: 130, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '', width: 65, align: 'center', fixed: 'right',
      render: (_: unknown, r: ReportGroupRow) => (
        <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => handleViewL1(r)}>
          查看
        </Button>
      ),
    },
  ]

  const orderDrawer = (
    <PurchaseOrderDrawer orderId={drawerOrderId} onClose={() => setDrawerOrderId(null)} />
  )

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (selectedL1) {
    return (
      <>
        {orderDrawer}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedL1(null)}>返回汇总</Button>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>
            {l1LabelTitle}：{selectedL1.name}
          </span>
          <span style={{ color: '#888', fontSize: 13 }}>{startDate} ~ {endDate}</span>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>进货总额</div>
            <div className={styles.statValue}>¥{selectedL1.totalAmount.toFixed(2)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>总数量</div>
            <div className={styles.statValue}>{selectedL1.totalQty}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>总件数</div>
            <div className={styles.statValue}>{selectedL1.totalPieces || '—'}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>订单数</div>
            <div className={styles.statValue}>{selectedL1.orderCount}</div>
          </div>
        </div>

        {detailLoading
          ? <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />
          : (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={l2Cache[selectedL1.id] ?? []}
              columns={l2Columns()}
              scroll={{ x: 600 }}
              expandable={{
                ...makeL2Expandable(selectedL1),
                expandedRowKeys: detailExpandedKeys,
                onExpandedRowsChange: keys => setDetailExpandedKeys(keys as number[]),
              }}
            />
          )
        }
      </>
    )
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <>
      {orderDrawer}
      <div className={styles.pageTitle}>采购报表</div>

      <div className={styles.toolbar} style={{ flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={v => v && setDateRange(v as [Dayjs, Dayjs])}
          presets={[
            { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
            { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
          ]}
        />
        <Radio.Group
          value={groupBy}
          onChange={e => setGroupBy(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          options={[
            { label: '按供应商汇总', value: 'supplier' },
            { label: '按货品汇总', value: 'product' },
          ]}
        />
        <Input
          prefix={<SearchOutlined />}
          placeholder={`搜索${l1LabelTitle}名称/编码`}
          allowClear
          style={{ width: 220 }}
          value={l1Search}
          onChange={e => setL1Search(e.target.value)}
        />
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>进货总额</div>
          <div className={styles.statValue}>¥{filteredStats.totalAmount.toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>总数量</div>
          <div className={styles.statValue}>{filteredStats.totalQty}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>总件数</div>
          <div className={styles.statValue}>{filteredStats.totalPieces || '—'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>订单数</div>
          <div className={styles.statValue}>{filteredStats.orderCount}</div>
        </div>
      </div>

      <Table
        rowKey="id"
        size="small"
        loading={l1Loading}
        dataSource={filteredL1}
        columns={l1Columns}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
        scroll={{ x: 700 }}
        expandable={{
          onExpand: handleL1Expand,
          expandedRowRender: (l1Row: ReportGroupRow) => {
            if (l2Loading[l1Row.id]) return <Spin size="small" style={{ display: 'block', padding: 12 }} />
            return (
              <Table rowKey="id" size="small" pagination={false}
                dataSource={l2Cache[l1Row.id] ?? []} columns={l2Columns()}
                scroll={{ x: 600 }} expandable={makeL2Expandable(l1Row)} />
            )
          },
        }}
      />
    </>
  )
}

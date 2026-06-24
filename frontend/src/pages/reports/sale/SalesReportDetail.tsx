import { useEffect, useState } from 'react'
import { Table, App, Button, Spin, Tag } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import {
  getSalesSubgroup, getSalesOrderRows,
  type ReportGroupRow, type ReportOrderRow,
} from '@/api/reports'
import { exportSalesExcel } from '@/utils/exportExcel'
import type { SalesDim } from './SalesReport'
import styles from '../Reports.module.css'

interface Props {
  selectedL1: ReportGroupRow
  startDate: string
  endDate: string
  groupBy: SalesDim
  l2Cache: Record<number, ReportGroupRow[]>
  setL2Cache: React.Dispatch<React.SetStateAction<Record<number, ReportGroupRow[]>>>
  l3Cache: Record<string, ReportOrderRow[]>
  setL3Cache: React.Dispatch<React.SetStateAction<Record<string, ReportOrderRow[]>>>
  onBack: () => void
  onOpenDrawer: (orderId: number) => void
}

export default function SalesReportDetail({
  selectedL1, startDate, endDate, groupBy,
  l2Cache, setL2Cache, l3Cache, setL3Cache,
  onBack, onOpenDrawer,
}: Props) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailExpandedKeys, setDetailExpandedKeys] = useState<number[]>([])
  const [l3Loading, setL3Loading] = useState<Record<string, boolean>>({})
  const [exporting, setExporting] = useState(false)

  const l1Label = groupBy === 'customer' ? '客户' : groupBy === 'product' ? '货品' : '供应商'
  const l2Label = groupBy === 'customer' ? '货品' : groupBy === 'product' ? '客户' : '货品'

  // On mount (or if entity/range changes), eagerly load all L2 + L3 so they
  // are pre-expanded for the user.
  useEffect(() => {
    setDetailLoading(true)
    setDetailExpandedKeys([])

    const fetchAll = async () => {
      let l2List = l2Cache[selectedL1.id]
      if (!l2List) {
        l2List = await getSalesSubgroup({ by: groupBy, parentId: selectedL1.id, startDate, endDate })
        setL2Cache(prev => ({ ...prev, [selectedL1.id]: l2List! }))
      }

      const results = await Promise.allSettled(
        l2List.map(async l2Row => {
          const key = `${selectedL1.id}-${l2Row.id}`
          if (l3Cache[key] !== undefined) return { key, data: l3Cache[key] }
          const params: Parameters<typeof getSalesOrderRows>[0] = { startDate, endDate }
          if (groupBy === 'customer') { params.customerId = selectedL1.id; params.productId = l2Row.id }
          else if (groupBy === 'product') { params.productId = selectedL1.id; params.customerId = l2Row.id }
          else { params.supplierId = selectedL1.id; params.productId = l2Row.id }
          const data = await getSalesOrderRows(params)
          return { key, data }
        })
      )

      const newL3: Record<string, ReportOrderRow[]> = {}
      results.forEach(r => { if (r.status === 'fulfilled') newL3[r.value.key] = r.value.data })
      setL3Cache(prev => ({ ...prev, ...newL3 }))
      setDetailExpandedKeys(l2List.map(r => r.id))
    }

    fetchAll()
      .catch(() => message.error('加载详情失败'))
      .finally(() => setDetailLoading(false))
  }, [selectedL1.id, startDate, endDate, groupBy])

  // Lazy-load a single L3 if user manually collapses then re-expands
  const handleL2Expand = (expanded: boolean, l2Row: ReportGroupRow) => {
    const key = `${selectedL1.id}-${l2Row.id}`
    if (!expanded || l3Cache[key] !== undefined) return
    setL3Loading(prev => ({ ...prev, [key]: true }))
    const params: Parameters<typeof getSalesOrderRows>[0] = { startDate, endDate }
    if (groupBy === 'customer') { params.customerId = selectedL1.id; params.productId = l2Row.id }
    else if (groupBy === 'product') { params.productId = selectedL1.id; params.customerId = l2Row.id }
    else { params.supplierId = selectedL1.id; params.productId = l2Row.id }
    getSalesOrderRows(params)
      .then(data => setL3Cache(prev => ({ ...prev, [key]: data })))
      .catch(() => setL3Cache(prev => ({ ...prev, [key]: [] })))
      .finally(() => setL3Loading(prev => ({ ...prev, [key]: false })))
  }

  const handleExport = () => {
    setExporting(true)
    const params: Parameters<typeof getSalesOrderRows>[0] = { startDate, endDate }
    if (groupBy === 'customer') params.customerId = selectedL1.id
    else if (groupBy === 'product') params.productId = selectedL1.id
    else params.supplierId = selectedL1.id
    getSalesOrderRows(params)
      .then(rows => exportSalesExcel(rows, startDate, endDate, selectedL1.name))
      .catch(() => message.error('导出失败'))
      .finally(() => setExporting(false))
  }

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
    { title: '件数', dataIndex: 'totalPieces', width: 75, align: 'center', render: v => v || '—' },
    { title: '金额', dataIndex: 'totalAmount', width: 110, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '毛利', dataIndex: 'totalProfit', width: 110, align: 'right',
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#389e0d' : '#cf1322' }}>
          {v >= 0 ? '+' : ''}¥{v.toFixed(2)}
        </span>
      ),
    },
  ]

  const profit = selectedL1.totalProfit ?? 0
  const detailMargin = selectedL1.totalAmount
    ? (profit / selectedL1.totalAmount * 100).toFixed(1)
    : null

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回汇总</Button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>
          {l1Label}：{selectedL1.name}
        </span>
        <span style={{ color: '#888', fontSize: 13 }}>{startDate} ~ {endDate}</span>
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>导出Excel</Button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>销售总额</div>
          <div className={styles.statValue}>¥{selectedL1.totalAmount.toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>合计毛利</div>
          <div className={profit >= 0 ? styles.statValueGreen : styles.statValueRed}>
            {profit >= 0 ? '+' : ''}¥{profit.toFixed(2)}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>毛利率</div>
          <div className={detailMargin !== null && Number(detailMargin) >= 0 ? styles.statValueGreen : styles.statValueRed}>
            {detailMargin !== null ? `${detailMargin}%` : '—'}
          </div>
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
            rowKey="id" size="small" pagination={false}
            dataSource={l2Cache[selectedL1.id] ?? []}
            columns={l2Columns}
            scroll={{ x: 700 }}
            expandable={{
              expandedRowKeys: detailExpandedKeys,
              onExpandedRowsChange: keys => setDetailExpandedKeys(keys as number[]),
              onExpand: (expanded, l2Row) => handleL2Expand(expanded, l2Row),
              expandedRowRender: (l2Row: ReportGroupRow) => {
                const key = `${selectedL1.id}-${l2Row.id}`
                if (l3Loading[key]) return <Spin size="small" style={{ display: 'block', padding: 12 }} />
                return (
                  <Table rowKey="orderNo" size="small" pagination={false}
                    dataSource={l3Cache[key] ?? []} columns={l3Columns} scroll={{ x: 950 }} />
                )
              },
            }}
          />
        )
      }
    </>
  )
}

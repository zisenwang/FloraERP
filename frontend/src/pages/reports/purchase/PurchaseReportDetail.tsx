import { useEffect, useState } from 'react'
import { Table, App, Button, Spin, Tag } from 'antd'
import { ArrowLeftOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import {
  getPurchaseSubgroup, getPurchaseOrderRows,
  type ReportGroupRow, type ReportOrderRow,
} from '@/api/reports'
import { exportPurchaseExcel } from '@/utils/exportExcel'
import type { PurchaseDim } from './PurchaseReport'
import styles from '../Reports.module.css'

interface Props {
  selectedL1: ReportGroupRow
  startDate: string
  endDate: string
  groupBy: PurchaseDim
  l2Cache: Record<number, ReportGroupRow[]>
  setL2Cache: React.Dispatch<React.SetStateAction<Record<number, ReportGroupRow[]>>>
  l3Cache: Record<string, ReportOrderRow[]>
  setL3Cache: React.Dispatch<React.SetStateAction<Record<string, ReportOrderRow[]>>>
  onBack: () => void
  onOpenDrawer: (orderId: number) => void
}

export default function PurchaseReportDetail({
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

  const l1Label = groupBy === 'supplier' ? '供应商' : '货品'
  const l2Label = groupBy === 'supplier' ? '货品' : '供应商'

  useEffect(() => {
    setDetailLoading(true)
    setDetailExpandedKeys([])

    const fetchAll = async () => {
      let l2List = l2Cache[selectedL1.id]
      if (!l2List) {
        l2List = await getPurchaseSubgroup({ by: groupBy, parentId: selectedL1.id, startDate, endDate })
        setL2Cache(prev => ({ ...prev, [selectedL1.id]: l2List! }))
      }

      const results = await Promise.allSettled(
        l2List.map(async l2Row => {
          const key = `${selectedL1.id}-${l2Row.id}`
          if (l3Cache[key] !== undefined) return { key, data: l3Cache[key] }
          const params: Parameters<typeof getPurchaseOrderRows>[0] = { startDate, endDate }
          if (groupBy === 'supplier') { params.supplierId = selectedL1.id; params.productId = l2Row.id }
          else { params.productId = selectedL1.id; params.supplierId = l2Row.id }
          const data = await getPurchaseOrderRows(params)
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

  const handleL2Expand = (expanded: boolean, l2Row: ReportGroupRow) => {
    const key = `${selectedL1.id}-${l2Row.id}`
    if (!expanded || l3Cache[key] !== undefined) return
    setL3Loading(prev => ({ ...prev, [key]: true }))
    const params: Parameters<typeof getPurchaseOrderRows>[0] = { startDate, endDate }
    if (groupBy === 'supplier') { params.supplierId = selectedL1.id; params.productId = l2Row.id }
    else { params.productId = selectedL1.id; params.supplierId = l2Row.id }
    getPurchaseOrderRows(params)
      .then(data => setL3Cache(prev => ({ ...prev, [key]: data })))
      .catch(() => setL3Cache(prev => ({ ...prev, [key]: [] })))
      .finally(() => setL3Loading(prev => ({ ...prev, [key]: false })))
  }

  const handleExport = () => {
    setExporting(true)
    const params: Parameters<typeof getPurchaseOrderRows>[0] = { startDate, endDate }
    if (groupBy === 'supplier') params.supplierId = selectedL1.id
    else params.productId = selectedL1.id
    getPurchaseOrderRows(params)
      .then(rows => exportPurchaseExcel(rows, startDate, endDate, selectedL1.name))
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
          {v}
        </span>
      ),
    },
    { title: '日期', dataIndex: 'orderDate', width: 100 },
    { title: '数量', dataIndex: 'qty', width: 70, align: 'center' },
    { title: '件数', dataIndex: 'pieces', width: 70, align: 'center', render: v => v || '—' },
    { title: '单价', dataIndex: 'unitPrice', width: 85, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '金额', dataIndex: 'finalAmount', width: 95, align: 'right',
      render: (v: number, r: ReportOrderRow) => (
        <span style={{ color: r.isReturn ? '#cf1322' : '#389e0d' }}>¥{v.toFixed(2)}</span>
      ),
    },
    {
      title: '', width: 60, align: 'center',
      render: (_: unknown, r: ReportOrderRow) => (
        <Button size="small" type="link" icon={<EyeOutlined />}
          onClick={() => r.isReturn ? navigate(`/purchase/returns/${r.orderId}`) : onOpenDrawer(r.orderId)}>
          查看
        </Button>
      ),
    },
  ]

  const l2Columns: ColumnsType<ReportGroupRow> = [
    { title: l2Label, dataIndex: 'name', width: 200 },
    { title: '订单数', dataIndex: 'orderCount', width: 80, align: 'center' },
    { title: '数量', dataIndex: 'totalQty', width: 80, align: 'center' },
    { title: '件数', dataIndex: 'totalPieces', width: 75, align: 'center', render: v => v || '—' },
    { title: '金额', dataIndex: 'totalAmount', width: 120, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
  ]

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
            rowKey="id" size="small" pagination={false}
            dataSource={l2Cache[selectedL1.id] ?? []}
            columns={l2Columns}
            scroll={{ x: 600 }}
            expandable={{
              expandedRowKeys: detailExpandedKeys,
              onExpandedRowsChange: keys => setDetailExpandedKeys(keys as number[]),
              onExpand: (expanded, l2Row) => handleL2Expand(expanded, l2Row),
              expandedRowRender: (l2Row: ReportGroupRow) => {
                const key = `${selectedL1.id}-${l2Row.id}`
                if (l3Loading[key]) return <Spin size="small" style={{ display: 'block', padding: 12 }} />
                return (
                  <Table rowKey="orderNo" size="small" pagination={false}
                    dataSource={l3Cache[key] ?? []} columns={l3Columns} scroll={{ x: 800 }} />
                )
              },
            }}
          />
        )
      }
    </>
  )
}

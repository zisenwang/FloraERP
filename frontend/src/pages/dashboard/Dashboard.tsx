import { useEffect, useState } from 'react'
import { Table, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getDashboardSummary, type DashboardSummary, type DailySalesRow } from '@/api/dashboard'
import { getInventory, type InventoryRow } from '@/api/inventory'
import { getSalesGroup, type ReportGroupRow } from '@/api/reports'
import { C_AMOUNT, C_LABEL } from '@/constants/colors'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [salesProductRank, setSalesProductRank] = useState<ReportGroupRow[]>([])
  const [salesSupplierRank, setSalesSupplierRank] = useState<ReportGroupRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = dayjs().format('YYYY-MM-DD')
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')

    Promise.all([
      getDashboardSummary(),
      getInventory(),
      getSalesGroup({ by: 'product', startDate: monthStart, endDate: today }),
      getSalesGroup({ by: 'supplier', startDate: monthStart, endDate: today }),
    ])
      .then(([summary, inv, productRank, supplierRank]) => {
        setData(summary)
        setInventory(inv)
        setSalesProductRank(productRank.slice(0, 10))
        setSalesSupplierRank(supplierRank.slice(0, 10))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  if (!data) return null

  // Inventory totals (client-side)
  const totalStock = inventory.reduce((s, r) => s + (r.stock || 0), 0)
  const totalPieces = inventory.reduce((s, r) =>
    r.unitsPerPiece ? s + Math.floor((r.stock || 0) / r.unitsPerPiece) : s, 0)
  const productTypes = inventory.filter(r => r.stock > 0).length

  // Today's qty + pieces from daily breakdown
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayRow = data.monthlySalesDaily.find(r => r.date === todayStr)
  const todayQty = todayRow?.salesQty ?? 0
  const todayPieces = todayRow?.pieces ?? 0

  const dailyTotals = (data.monthlySalesDaily ?? []).reduce(
    (acc, r: DailySalesRow) => ({
      salesQty: acc.salesQty + r.salesQty,
      salesAmount: acc.salesAmount + r.salesAmount,
      pieces: acc.pieces + r.pieces,
      returnQty: acc.returnQty + r.returnQty,
      returnAmount: acc.returnAmount + r.returnAmount,
    }),
    { salesQty: 0, salesAmount: 0, pieces: 0, returnQty: 0, returnAmount: 0 },
  )

  // ── Column definitions ────────────────────────────────────────────────────

  const salesRankColumns = [
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 55 },
    { title: '客户', render: (_: unknown, r: { customerCode: string; customerName: string }) => <span style={{ color: C_LABEL }}>{r.customerCode} {r.customerName}</span>, width: 200 },
    { title: '金额', dataIndex: 'totalAmount', render: (v: number) => <span style={{ color: C_AMOUNT, fontWeight: 600 }}>¥{v.toLocaleString()}</span>, align: 'right' as const, width: 200 },
    { title: '件数', dataIndex: 'totalPieces', align: 'right' as const, width: 70 },
  ]

  const salesProductRankColumns = [
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 55 },
    { title: '货品', dataIndex: 'name', render: (v: string) => <span style={{ color: C_LABEL }}>{v}</span> },
    { title: '金额', dataIndex: 'totalAmount', render: (v: number) => <span style={{ color: C_AMOUNT, fontWeight: 600 }}>¥{v.toLocaleString()}</span>, align: 'right' as const, width: 120 },
    { title: '数量', dataIndex: 'totalQty', align: 'right' as const, width: 70 },
  ]

  const salesSupplierRankColumns = [
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 55 },
    { title: '供应商', dataIndex: 'name', render: (v: string) => <span style={{ color: C_LABEL }}>{v}</span> },
    { title: '金额', dataIndex: 'totalAmount', render: (v: number) => <span style={{ color: C_AMOUNT, fontWeight: 600 }}>¥{v.toLocaleString()}</span>, align: 'right' as const, width: 120 },
    { title: '数量', dataIndex: 'totalQty', align: 'right' as const, width: 70 },
  ]

  const dailySalesColumns = [
    { title: '日期', dataIndex: 'date', width: 100 },
    { title: '销售数量', dataIndex: 'salesQty', align: 'right' as const, width: 80 },
    {
      title: '销售金额', dataIndex: 'salesAmount', align: 'right' as const, width: 100,
      render: (v: number) => <span style={{ color: C_AMOUNT, fontWeight: 600 }}>¥{v.toLocaleString()}</span>,
    },
    { title: '件数', dataIndex: 'pieces', align: 'right' as const, width: 65 },
    { title: '退货数量', dataIndex: 'returnQty', align: 'right' as const, width: 80,
      render: (v: number) => v > 0 ? <span style={{ color: '#cf1322' }}>{v}</span> : v,
    },
    {
      title: '退货金额', dataIndex: 'returnAmount', align: 'right' as const, width: 100,
      render: (v: number) => v > 0 ? <span style={{ color: '#cf1322', fontWeight: 600 }}>¥{v.toLocaleString()}</span> : '—',
    },
  ]

  return (
    <div className={styles.page}>
      {/* Compact overview card */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewRow}>
          <span className={styles.dotOrange} />
          <span className={styles.overviewText}>
            今日销售：<strong>{todayQty.toLocaleString()}</strong> 盆，共 <strong>{data.todaySales.toLocaleString()}</strong> 元
            （<strong>{todayPieces}</strong> 件）
          </span>
          <span className={styles.overviewAction} onClick={() => navigate('/sales/orders/new')}>销售开单 →</span>
        </div>
        <div className={styles.overviewRow}>
          <span className={styles.dotGreen} />
          <span className={styles.overviewText}>
            本月销售：<strong>{dailyTotals.salesQty.toLocaleString()}</strong> 盆，共 <strong>{dailyTotals.salesAmount.toLocaleString()}</strong> 元
            （<strong>{dailyTotals.pieces}</strong> 件）
            {dailyTotals.returnQty > 0 && (
              <span className={styles.overviewReturn}>
                　退货 {dailyTotals.returnQty} 盆 / ¥{dailyTotals.returnAmount.toLocaleString()}
              </span>
            )}
          </span>
        </div>
        <div className={styles.overviewRow}>
          <span className={styles.dotBlue} />
          <span className={styles.overviewText}>
            今日收款：<strong>{data.todayIncome.toLocaleString()}</strong> 元
            <span className={styles.overviewSep} />
            今日采购：<strong>{data.todayPurchase.toLocaleString()}</strong> 元
            <span className={styles.overviewSep} />
            今日开单：<strong>{data.todayOrderCount}</strong> 单
          </span>
        </div>
        <div className={styles.overviewRow} onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }}>
          <span className={styles.dotPurple} />
          <span className={styles.overviewText}>
            当前库存：<strong>{totalStock.toLocaleString()}</strong> 盆，共 <strong>{totalPieces.toLocaleString()}</strong> 件
            （<strong>{productTypes}</strong> 种有货）
          </span>
          <span className={styles.overviewLink}>查看库存 →</span>
        </div>
      </div>

      {/* Row 1: Daily sales (left, wider) + Customer rank (right) */}
      <div className={styles.rankRow}>
        <div className={styles.section} style={{ flex: 2 }}>
          <div className={styles.sectionTitle}>
            <span>
              本月每日销售情况
            </span>
            <span
              className={styles.sectionTitleLink}
              onClick={() => navigate('/reports/rankings?type=sales&by=daily')}
            >
              查看图表 →
            </span>
          </div>
          <Table
            columns={dailySalesColumns}
            dataSource={data.monthlySalesDaily}
            rowKey="date"
            pagination={false}
            size="small"
            scroll={{ y: 320 }}
            onRow={() => ({ style: { cursor: 'pointer' }, onClick: () => navigate('/reports/rankings?type=sales&by=daily') })}
          />
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            本月销售排行（客户）
            <span
              className={styles.sectionTitleLink}
              onClick={() => navigate('/reports/rankings?type=sales&by=customer')}
            >
              查看全部 →
            </span>
          </div>
          <Table
            columns={salesRankColumns}
            dataSource={data.monthlySalesRank}
            rowKey="customerName"
            pagination={false}
            size="small"
            onRow={() => ({ style: { cursor: 'pointer' }, onClick: () => navigate('/reports/rankings?type=sales&by=customer') })}
          />
        </div>
      </div>

      {/* Row 2: Sales product rank + Sales supplier rank */}
      <div className={styles.rankRow}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            本月销售排行（货品）
            <span
              className={styles.sectionTitleLink}
              onClick={() => navigate('/reports/rankings?type=sales&by=product')}
            >
              查看全部 →
            </span>
          </div>
          <Table
            columns={salesProductRankColumns}
            dataSource={salesProductRank}
            rowKey="name"
            pagination={false}
            size="small"
            onRow={() => ({ style: { cursor: 'pointer' }, onClick: () => navigate('/reports/rankings?type=sales&by=product') })}
          />
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            本月销售排行（供应商）
            <span
              className={styles.sectionTitleLink}
              onClick={() => navigate('/reports/rankings?type=sales&by=supplier')}
            >
              查看全部 →
            </span>
          </div>
          <Table
            columns={salesSupplierRankColumns}
            dataSource={salesSupplierRank}
            rowKey="name"
            pagination={false}
            size="small"
            onRow={() => ({ style: { cursor: 'pointer' }, onClick: () => navigate('/reports/rankings?type=sales&by=supplier') })}
          />
        </div>
      </div>
    </div>
  )
}

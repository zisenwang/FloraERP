import { useEffect, useState } from 'react'
import { Table, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import { getDashboardSummary, type DashboardSummary, type DailySalesRow } from '@/api/dashboard'
import { getInventory, type InventoryRow } from '@/api/inventory'
import { C_AMOUNT, C_LABEL } from '@/constants/colors'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboardSummary(), getInventory()])
      .then(([summary, inv]) => {
        setData(summary)
        setInventory(inv)
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

  const salesRankColumns = [
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 55 },
    { title: '客户', render: (_: unknown, r: { customerCode: string; customerName: string }) => <span style={{ color: C_LABEL }}>{r.customerCode} {r.customerName}</span>, width: 200 },
    { title: '金额', dataIndex: 'totalAmount', render: (v: number) => <span style={{ color: C_AMOUNT, fontWeight: 600 }}>¥{v.toLocaleString()}</span>, align: 'right' as const, width: 200 },
    { title: '件数', dataIndex: 'totalPieces', align: 'right' as const, width: 70 },
  ]

  const purchaseSupplierRankColumns = [
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 55 },
    { title: '供应商', render: (_: unknown, r: { supplierCode: string; supplierName: string }) => <span style={{ color: C_LABEL }}>{r.supplierCode} {r.supplierName}</span>, width: 200 },
    { title: '进货数量', dataIndex: 'totalQty', align: 'right' as const, width: 200 },
  ]

  const purchaseProductRankColumns = [
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 55 },
    { title: '货品', render: (_: unknown, r: { productCode: string; productName: string }) => <span style={{ color: C_LABEL }}>{r.productCode} {r.productName}</span>, width: 200 },
    { title: '供应商', render: (_: unknown, r: { supplierCode: string; supplierName: string }) => <span style={{ color: C_LABEL }}>{r.supplierCode} {r.supplierName}</span>, width: 200 },
    { title: '进货数量', dataIndex: 'totalQty', align: 'right' as const, width: 90 },
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

      {/* Rank Tables */}
      <div className={styles.rankRow}>
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
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            本月进货排行（货品）
            <span
              className={styles.sectionTitleLink}
              onClick={() => navigate('/reports/rankings?type=purchase&by=product')}
            >
              查看全部 →
            </span>
          </div>
          <Table
            columns={purchaseProductRankColumns}
            dataSource={data.monthlyPurchaseProductRank}
            rowKey="productCode"
            pagination={false}
            size="small"
            onRow={() => ({ style: { cursor: 'pointer' }, onClick: () => navigate('/reports/rankings?type=purchase&by=product') })}
          />
        </div>
      </div>


      <div className={styles.rankRow}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            本月进货排行（供应商）
            <span
              className={styles.sectionTitleLink}
              onClick={() => navigate('/reports/rankings?type=purchase&by=supplier')}
            >
              查看全部 →
            </span>
          </div>
          <Table
            columns={purchaseSupplierRankColumns}
            dataSource={data.monthlyPurchaseSupplierRank}
            rowKey="supplierName"
            pagination={false}
            size="small"
            onRow={() => ({ style: { cursor: 'pointer' }, onClick: () => navigate('/reports/rankings?type=purchase&by=supplier') })}
          />
        </div>
        <div className={styles.section} style={{ flex: 2 }}>
          <div className={styles.sectionTitle}>
            <span>
              本月每日销售情况
              <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 12, color: '#888' }}>
                合计：销售 {dailyTotals.salesQty} 盆 / ¥{dailyTotals.salesAmount.toLocaleString()} / {dailyTotals.pieces} 件
                {dailyTotals.returnQty > 0 && `　退货 ${dailyTotals.returnQty} 盆 / ¥${dailyTotals.returnAmount.toLocaleString()}`}
              </span>
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
      </div>
    </div>
  )
}

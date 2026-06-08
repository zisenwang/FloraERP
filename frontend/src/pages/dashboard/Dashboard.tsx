import { useEffect, useState } from 'react'
import { Table, Spin } from 'antd'
import { getDashboardSummary, type DashboardSummary } from '@/api/dashboard'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardSummary()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  if (!data) return null

  const salesRankColumns = [
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 60 },
    { title: '客户', dataIndex: 'customerName' },
    { title: '金额', dataIndex: 'totalAmount', render: (v: number) => `¥${v.toLocaleString()}`, align: 'right' as const },
    { title: '件数', dataIndex: 'totalPieces', align: 'right' as const },
  ]

  const purchaseRankColumns = [
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 60 },
    { title: '供应商', dataIndex: 'supplierName' },
    { title: '金额', dataIndex: 'totalAmount', render: (v: number) => `¥${v.toLocaleString()}`, align: 'right' as const },
    { title: '数量', dataIndex: 'totalQty', align: 'right' as const },
  ]

  return (
    <div className={styles.page}>
      {/* KPI Cards */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>今日销售额</div>
          <div className={`${styles.kpiValue} ${styles.kpiValueGreen}`}>
            ¥{data.todaySales.toLocaleString()}
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>今日收款</div>
          <div className={`${styles.kpiValue} ${styles.kpiValueBlue}`}>
            ¥{data.todayIncome.toLocaleString()}
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>今日采购额</div>
          <div className={`${styles.kpiValue} ${styles.kpiValueOrange}`}>
            ¥{data.todayPurchase.toLocaleString()}
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>今日开单数</div>
          <div className={styles.kpiValue}>{data.todayOrderCount} 单</div>
        </div>
      </div>

      {/* Rank Tables */}
      <div className={styles.rankRow}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>本月销售排行（客户）</div>
          <Table
            columns={salesRankColumns}
            dataSource={data.monthlySalesRank}
            rowKey="customerName"
            pagination={false}
            size="small"
          />
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>本月采购排行（供应商）</div>
          <Table
            columns={purchaseRankColumns}
            dataSource={data.monthlyPurchaseRank}
            rowKey="supplierName"
            pagination={false}
            size="small"
          />
        </div>
      </div>
    </div>
  )
}

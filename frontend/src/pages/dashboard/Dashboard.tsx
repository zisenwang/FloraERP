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
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 55 },
    { title: '客户', render: (_: unknown, r: { customerCode: string; customerName: string }) => `${r.customerCode} ${r.customerName}`, width: 200 },
    { title: '金额', dataIndex: 'totalAmount', render: (v: number) => `¥${v.toLocaleString()}`, align: 'right' as const, width: 200 },
    { title: '件数', dataIndex: 'totalPieces', align: 'right' as const, width: 70 },
  ]

  const purchaseSupplierRankColumns = [
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 55 },
    { title: '供应商', render: (_: unknown, r: { supplierCode: string; supplierName: string }) => `${r.supplierCode} ${r.supplierName}`, width: 200 },
    { title: '进货数量', dataIndex: 'totalQty', align: 'right' as const, width: 200 },
  ]

  const purchaseProductRankColumns = [
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 55 },
    { title: '货品', render: (_: unknown, r: { productCode: string; productName: string }) => `${r.productCode} ${r.productName}`, width: 200 },
    { title: '供应商', render: (_: unknown, r: { supplierCode: string; supplierName: string }) => `${r.supplierCode} ${r.supplierName}`, width: 200 },
    { title: '进货数量', dataIndex: 'totalQty', align: 'right' as const, width: 90 },
  ]

  const productProfitRankColumns = [
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 55 },
    { title: '货品', render: (_: unknown, r: { productCode: string; productName: string }) => `${r.productCode} ${r.productName}`, width: 180 },
    { title: '供应商', render: (_: unknown, r: { supplierCode: string; supplierName: string }) => `${r.supplierCode} ${r.supplierName}`, width: 150 },
    {
      title: '毛利', dataIndex: 'totalProfit', align: 'right' as const, width: 110,
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#389e0d' : '#cf1322', fontWeight: 600 }}>
          {v >= 0 ? '+' : ''}¥{v.toFixed(2)}
        </span>
      ),
    },
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
          <div className={styles.sectionTitle}>本月进货排行（货品）</div>
          <Table
            columns={purchaseProductRankColumns}
            dataSource={data.monthlyPurchaseProductRank}
            rowKey="productCode"
            pagination={false}
            size="small"
          />
        </div>
      </div>


      <div className={styles.rankRow}>
        {/* Profit Rank */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>本月进货排行（供应商）</div>
          <Table
              columns={purchaseSupplierRankColumns}
              dataSource={data.monthlyPurchaseSupplierRank}
              rowKey="supplierName"
              pagination={false}
              size="small"
          />
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>本月毛利排行（货品）</div>
          <Table
            columns={productProfitRankColumns}
            dataSource={data.monthlyProductProfitRank}
            rowKey="productCode"
            pagination={false}
            size="small"
          />
        </div>
      </div>
    </div>
  )
}

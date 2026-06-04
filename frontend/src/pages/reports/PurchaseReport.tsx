import { useEffect, useState } from 'react'
import { Table, DatePicker, Select, App } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getPurchaseReport, type PurchaseReportData } from '@/api/reports'
import { getSuppliers, type Supplier } from '@/api/suppliers'
import { getErrorMessage } from '@/utils/error'
import type { PurchaseOrder } from '@/api/purchase'
import styles from './Reports.module.css'

export default function PurchaseReport() {
  const { message } = App.useApp()
  const [data, setData] = useState<PurchaseReportData | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'), dayjs().endOf('month'),
  ])
  const [supplierId, setSupplierId] = useState<number | undefined>()

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getPurchaseReport({
      start_date: dateRange[0].format('YYYY-MM-DD'),
      end_date:   dateRange[1].format('YYYY-MM-DD'),
      supplier_id: supplierId,
    })
      .then(setData)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [dateRange, supplierId])

  const columns: ColumnsType<PurchaseOrder> = [
    { title: '单号', dataIndex: 'order_no', width: 160 },
    { title: '供应商', dataIndex: 'supplier_name', width: 120 },
    { title: '日期', dataIndex: 'order_date', width: 110 },
    {
      title: '进货金额', dataIndex: 'total_amount', width: 120, align: 'right',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '已付款', dataIndex: 'paid_amount', width: 110, align: 'right',
      render: (v: number) => <span style={{ color: '#389e0d' }}>¥{v.toFixed(2)}</span>,
    },
    {
      title: '未付款', width: 110, align: 'right',
      render: (_: unknown, r: PurchaseOrder) => {
        const unpaid = r.total_amount - r.paid_amount
        return unpaid > 0 ? <span style={{ color: '#cf1322' }}>¥{unpaid.toFixed(2)}</span> : '—'
      },
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>采购报表</div>

      <div className={styles.toolbar}>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={v => v && setDateRange(v as [Dayjs, Dayjs])}
          presets={[
            { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
            { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
          ]}
        />
        <Select
          allowClear placeholder="所有供应商"
          style={{ width: 160 }}
          options={suppliers.map(s => ({ value: s.id, label: `${s.code} ${s.name}` }))}
          onChange={v => setSupplierId(v)}
        />
      </div>

      {data && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>订单数</div>
            <div className={styles.statValue}>{data.total_orders}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>进货总额</div>
            <div className={styles.statValue}>¥{data.total_amount.toFixed(2)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>已付款</div>
            <div className={styles.statValueGreen}>¥{data.total_paid.toFixed(2)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>未付款</div>
            <div className={data.total_unpaid > 0 ? styles.statValueRed : styles.statValue}>
              ¥{data.total_unpaid.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.orders ?? []}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
        size="small"
      />
    </>
  )
}

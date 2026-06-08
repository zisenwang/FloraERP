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
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate:   dateRange[1].format('YYYY-MM-DD'),
      supplierId,
    })
      .then(setData)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [dateRange, supplierId])

  const columns: ColumnsType<PurchaseOrder> = [
    { title: '单号', dataIndex: 'orderNo', width: 160 },
    { title: '供应商', dataIndex: 'supplierName', width: 120 },
    { title: '日期', dataIndex: 'orderDate', width: 110 },
    {
      title: '进货金额', dataIndex: 'totalAmount', width: 120, align: 'right',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '折后金额', dataIndex: 'finalAmount', width: 110, align: 'right',
      render: (v: number) => <span style={{ color: '#389e0d' }}>¥{v.toFixed(2)}</span>,
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
            <div className={styles.statValue}>{data.totalOrders}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>进货总额</div>
            <div className={styles.statValue}>¥{data.totalAmount.toFixed(2)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>总数量</div>
            <div className={styles.statValue}>{data.totalQty}</div>
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

import { useEffect, useState } from 'react'
import { Table, DatePicker, Select, Tag, App } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getSalesReport, type SalesReportData } from '@/api/reports'
import { getCustomers, type Customer } from '@/api/customers'
import { getErrorMessage } from '@/utils/error'
import type { SalesOrder } from '@/api/sales'
import styles from './Reports.module.css'

const PAY_STATUS_MAP: Record<string, { color: string; label: string }> = {
  '未收款':  { color: 'red',    label: '未收款' },
  '部分收款': { color: 'orange', label: '部分收款' },
  '已收款':  { color: 'green',  label: '已收款' },
}

export default function SalesReport() {
  const { message } = App.useApp()
  const [data, setData] = useState<SalesReportData | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'), dayjs().endOf('month'),
  ])
  const [customerId, setCustomerId] = useState<number | undefined>()

  useEffect(() => {
    getCustomers().then(setCustomers).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getSalesReport({
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate:   dateRange[1].format('YYYY-MM-DD'),
      customerId,
    })
      .then(setData)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [dateRange, customerId])

  const columns: ColumnsType<SalesOrder> = [
    { title: '单号', dataIndex: 'orderNo', width: 160 },
    { title: '客户', dataIndex: 'customerName', width: 120 },
    { title: '日期', dataIndex: 'orderDate', width: 110 },
    {
      title: '合计金额', dataIndex: 'totalAmount', width: 120, align: 'right',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '收款状态', dataIndex: 'paymentStatus', width: 100, align: 'center',
      render: (v: string) => {
        const s = PAY_STATUS_MAP[v] ?? { color: 'default', label: v }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>销售报表</div>

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
          allowClear placeholder="所有客户"
          style={{ width: 160 }}
          options={customers.map(c => ({ value: c.id, label: `${c.code} ${c.name}` }))}
          onChange={v => setCustomerId(v)}
        />
      </div>

      {data && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>订单数</div>
            <div className={styles.statValue}>{data.totalOrders}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>销售总额</div>
            <div className={styles.statValue}>¥{data.totalAmount.toFixed(2)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>已收款</div>
            <div className={styles.statValueGreen}>¥{data.totalPaid.toFixed(2)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>未收款</div>
            <div className={data.totalUnpaid > 0 ? styles.statValueRed : styles.statValue}>
              ¥{data.totalUnpaid.toFixed(2)}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>毛利合计</div>
            <div className={data.totalProfit >= 0 ? styles.statValueGreen : styles.statValueRed}>
              {data.totalProfit >= 0 ? '+' : ''}¥{data.totalProfit.toFixed(2)}
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

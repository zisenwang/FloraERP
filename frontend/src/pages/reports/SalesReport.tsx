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
  unpaid:  { color: 'red',    label: '未收款' },
  partial: { color: 'orange', label: '部分收款' },
  paid:    { color: 'green',  label: '已收款' },
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
      start_date: dateRange[0].format('YYYY-MM-DD'),
      end_date:   dateRange[1].format('YYYY-MM-DD'),
      customer_id: customerId,
    })
      .then(setData)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [dateRange, customerId])

  const columns: ColumnsType<SalesOrder> = [
    { title: '单号', dataIndex: 'order_no', width: 160 },
    { title: '客户', dataIndex: 'customer_name', width: 120 },
    { title: '日期', dataIndex: 'order_date', width: 110 },
    {
      title: '合计金额', dataIndex: 'total_amount', width: 120, align: 'right',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '已收款', dataIndex: 'paid_amount', width: 110, align: 'right',
      render: (v: number) => <span style={{ color: '#389e0d' }}>¥{v.toFixed(2)}</span>,
    },
    {
      title: '未收款', width: 110, align: 'right',
      render: (_: unknown, r: SalesOrder) => {
        const unpaid = r.total_amount - r.paid_amount
        return unpaid > 0 ? <span style={{ color: '#cf1322' }}>¥{unpaid.toFixed(2)}</span> : '—'
      },
    },
    {
      title: '收款状态', dataIndex: 'pay_status', width: 100, align: 'center',
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
            <div className={styles.statValue}>{data.total_orders}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>销售总额</div>
            <div className={styles.statValue}>¥{data.total_amount.toFixed(2)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>已收款</div>
            <div className={styles.statValueGreen}>¥{data.total_paid.toFixed(2)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>未收款</div>
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

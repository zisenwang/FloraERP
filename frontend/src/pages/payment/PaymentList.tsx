import { useEffect, useState } from 'react'
import { Table, DatePicker, Select, App } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getPayments, type Payment } from '@/api/payments'
import { getCustomers, type Customer } from '@/api/customers'
import { getErrorMessage } from '@/utils/error'
import styles from './Payment.module.css'

export default function PaymentList() {
  const { message } = App.useApp()
  const [payments, setPayments] = useState<Payment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [customerId, setCustomerId] = useState<number | undefined>()
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)

  useEffect(() => {
    getCustomers().then(setCustomers).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getPayments({
      customerId,
      startDate: dateRange?.[0].format('YYYY-MM-DD'),
      endDate:   dateRange?.[1].format('YYYY-MM-DD'),
    })
      .then(setPayments)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [customerId, dateRange])

  const totalAmount = payments.reduce((s, p) => s + p.amount, 0)

  const columns: ColumnsType<Payment> = [
    { title: '日期', dataIndex: 'paymentDate', width: 110 },
    { title: '单号', dataIndex: 'orderNo', width: 160 },
    { title: '客户', dataIndex: 'customerName', width: 130 },
    {
      title: '金额', dataIndex: 'amount', width: 120, align: 'right',
      render: (v: number) => (
        <span style={{ color: '#389e0d', fontWeight: 600 }}>
          ¥{v.toFixed(2)}
        </span>
      ),
    },
    { title: '方式', dataIndex: 'method', width: 100 },
    { title: '备注', dataIndex: 'notes', ellipsis: true },
    { title: '操作人', dataIndex: 'operator', width: 90 },
  ]

  return (
    <>
      <div className={styles.pageTitle}>收款管理</div>

      <div className={styles.toolbar}>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={v => setDateRange(v as [Dayjs, Dayjs] | null)}
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

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>收款合计</div>
          <div className={styles.statValueGreen}>+¥{totalAmount.toFixed(2)}</div>
        </div>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={payments}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
        size="small"
      />
    </>
  )
}

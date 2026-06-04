import { useEffect, useState } from 'react'
import { Table, DatePicker, Select, Tag, App } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getPayments, type Payment } from '@/api/payments'
import { getErrorMessage } from '@/utils/error'
import styles from './Payment.module.css'

export default function PaymentList() {
  const { message } = App.useApp()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)

  useEffect(() => {
    setLoading(true)
    getPayments({
      type,
      start_date: dateRange?.[0].format('YYYY-MM-DD'),
      end_date:   dateRange?.[1].format('YYYY-MM-DD'),
    })
      .then(setPayments)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [type, dateRange])

  const totalIn  = payments.filter(p => p.type === '收款').reduce((s, p) => s + p.amount, 0)
  const totalOut = payments.filter(p => p.type === '付款').reduce((s, p) => s + p.amount, 0)

  const columns: ColumnsType<Payment> = [
    { title: '流水号', dataIndex: 'payment_no', width: 180 },
    { title: '日期', dataIndex: 'payment_date', width: 110 },
    {
      title: '类型', dataIndex: 'type', width: 80, align: 'center',
      render: (v: string) => <Tag color={v === '收款' ? 'green' : 'red'}>{v}</Tag>,
    },
    { title: '往来方', dataIndex: 'party_name', width: 130 },
    { title: '关联单号', dataIndex: 'related_order_no', width: 160 },
    {
      title: '金额', dataIndex: 'amount', width: 120, align: 'right',
      render: (v: number, record: Payment) => (
        <span style={{ color: record.type === '收款' ? '#389e0d' : '#cf1322', fontWeight: 600 }}>
          {record.type === '收款' ? '+' : '-'}¥{v.toFixed(2)}
        </span>
      ),
    },
    { title: '收付方式', dataIndex: 'payment_method', width: 100 },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '操作人', dataIndex: 'operator', width: 90 },
  ]

  return (
    <>
      <div className={styles.pageTitle}>收支管理</div>

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
          allowClear placeholder="全部类型"
          style={{ width: 110 }}
          options={[
            { value: '收款', label: '收款' },
            { value: '付款', label: '付款' },
          ]}
          onChange={v => setType(v)}
        />
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>收款合计</div>
          <div className={styles.statValueGreen}>+¥{totalIn.toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>付款合计</div>
          <div className={styles.statValueRed}>-¥{totalOut.toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>净收入</div>
          <div className={totalIn - totalOut >= 0 ? styles.statValueGreen : styles.statValueRed}>
            ¥{(totalIn - totalOut).toFixed(2)}
          </div>
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

import { useEffect, useState } from 'react'
import { Table, DatePicker, Input, Button, App} from 'antd'
import { PlusOutlined, DeleteOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getPayments, deletePayment, type Payment } from '@/api/payments'
import { getSalesOrders, type SalesOrder } from '@/api/sales'
import { getErrorMessage } from '@/utils/error'
import { exportPaymentsExcel } from '@/utils/exportExcel'
import { C_AMOUNT, C_LABEL } from '@/constants/colors'
import { PAGE_SIZE } from '@/constants/pagination'
import SalesOrderModal from '@/components/SalesOrderModal'
import AddPaymentModal from '@/components/AddPaymentModal'
import styles from './Payment.module.css'

// ─── Payment List Page ────────────────────────────────────────────────────────

export default function PaymentList() {
  const { message, modal } = App.useApp()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([dayjs().startOf('month'), dayjs().endOf('month')])
  const [addOpen, setAddOpen] = useState(false)
  const [deleting, setDeleting] = useState<Record<number, boolean>>({})
  const [drawerOrderId, setDrawerOrderId] = useState<number | null>(null)

  // Receivable summary filtered by the same date range
  const [unpaidOrders, setUnpaidOrders] = useState<SalesOrder[]>([])

  const fetchPayments = () => {
    setLoading(true)
    getPayments({
      startDate: dateRange?.[0].format('YYYY-MM-DD'),
      endDate:   dateRange?.[1].format('YYYY-MM-DD'),
    })
      .then(setPayments)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  const fetchUnpaid = () => {
    getSalesOrders({
      startDate: dateRange?.[0].format('YYYY-MM-DD'),
      endDate:   dateRange?.[1].format('YYYY-MM-DD'),
    })
      .then(data => setUnpaidOrders(data.filter(o => o.paymentStatus !== '已收款')))
      .catch(() => {})
  }

  useEffect(() => { fetchPayments() }, [dateRange])
  useEffect(() => { fetchUnpaid() }, [dateRange])

  const handleDelete = (record: Payment) => {
    modal.confirm({
      title: '确认删除',
      content: `删除「${record.orderNo}」的收款记录 ¥${record.amount.toFixed(2)}？销售单状态将同步更新。`,
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => {
        setDeleting(prev => ({ ...prev, [record.id]: true }))
        return deletePayment(record.id)
          .then(() => { message.success('已删除'); fetchPayments(); fetchUnpaid() })
          .catch(err => message.error(getErrorMessage(err)))
          .finally(() => setDeleting(prev => ({ ...prev, [record.id]: false })))
      },
    })
  }

  const kw = customerSearch.trim().toLowerCase()
  const filtered = kw
    ? payments.filter(p =>
        p.customerName?.toLowerCase().includes(kw) ||
        p.customerCode?.toLowerCase().includes(kw) ||
        p.orderNo?.toLowerCase().includes(kw)
      )
    : payments

  const totalCollected   = filtered.reduce((s, p) => s + p.amount, 0)
  const receivableAmount = unpaidOrders.reduce((s, o) => s + o.totalAmount, 0)
  const unpaidCount      = unpaidOrders.filter(o => o.paymentStatus === '未收款').length

  const columns: ColumnsType<Payment> = [
    { title: '日期', dataIndex: 'paymentDate', width: 110 },
    {
      title: '单号', dataIndex: 'orderNo', width: 160,
      render: (v: string, r: Payment) => (
        <Button type="link" size="small" style={{ padding: 0 }}
          onClick={() => setDrawerOrderId(r.salesOrderId)}>
          {v}
        </Button>
      ),
    },
    {
      title: '客户', width: 160,
      render: (_: unknown, r: Payment) => <span style={{ color: C_LABEL }}>{r.customerCode} {r.customerName}</span>,
    },
    {
      title: '金额', dataIndex: 'amount', width: 120, align: 'right',
      render: (v: number) => (
        <span style={{ color: C_AMOUNT, fontWeight: 600 }}>¥{v.toFixed(2)}</span>
      ),
    },
    { title: '方式', dataIndex: 'method',   width: 90 },
    { title: '备注', dataIndex: 'notes',    width: 200, ellipsis: true },
    { title: '操作人', dataIndex: 'operator', width: 90 },
    {
      title: '操作', width: 70, align: 'center', fixed: 'right',
      render: (_: unknown, record: Payment) => (
        <Button
          type="link" size="small" danger icon={<DeleteOutlined />}
          loading={deleting[record.id]}
          onClick={() => handleDelete(record)}
        />
      ),
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>收款管理</div>

      <div className={styles.toolbar}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索客户或单号"
          allowClear
          style={{ width: 200 }}
          value={customerSearch}
          onChange={e => setCustomerSearch(e.target.value)}
        />
        <DatePicker.RangePicker
          value={dateRange}
          onChange={v => setDateRange(v as [Dayjs, Dayjs] | null)}
          presets={[
            { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
            { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
          ]}
        />
        <Button
          icon={<DownloadOutlined />}
          onClick={() => {
            const sd = dateRange?.[0].format('YYYY-MM-DD') ?? ''
            const ed = dateRange?.[1].format('YYYY-MM-DD') ?? ''
            exportPaymentsExcel(filtered, sd, ed)
          }}
        >
          导出
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          新增收款
        </Button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>本期收款</div>
          <div className={styles.statValueGreen}>+¥{totalCollected.toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>应收金额</div>
          <div className={styles.statValueRed}>¥{receivableAmount.toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>未收款订单</div>
          <div className={styles.statValue}>{unpaidCount}</div>
        </div>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        size="small"
        scroll={{ x: 800 }}
        pagination={{ pageSize: PAGE_SIZE, showTotal: total => `共 ${total} 条` }}
      />

      <AddPaymentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { fetchPayments(); fetchUnpaid() }}
      />

      <SalesOrderModal
        orderId={drawerOrderId}
        onClose={() => setDrawerOrderId(null)}
      />
    </>
  )
}

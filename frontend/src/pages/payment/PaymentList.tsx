import { useEffect, useState } from 'react'
import {
  Table, DatePicker, Input, Button, App, Modal, Form, InputNumber,
  Select, Tag, Spin,
} from 'antd'
import { PlusOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getPayments, createPayment, deletePayment, type Payment } from '@/api/payments'
import { getSalesOrders, type SalesOrder } from '@/api/sales'
import { getErrorMessage } from '@/utils/error'
import styles from './Payment.module.css'

const METHOD_OPTIONS = [
  { value: '微信', label: '微信' },
  { value: '支付宝', label: '支付宝' },
  { value: '现金', label: '现金' },
  { value: '其他', label: '其他' },
]

const PAY_STATUS_COLOR: Record<string, string> = {
  '未收款': 'red', '部分收款': 'orange', '已收款': 'green',
}

// ─── Add Payment Modal ────────────────────────────────────────────────────────

function AddPaymentModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setOrdersLoading(true)
    getSalesOrders()
      .then(data => setOrders(data.filter(o => o.paymentStatus !== '已收款')))
      .catch(() => {})
      .finally(() => setOrdersLoading(false))
  }, [open])

  const handleClose = () => {
    setSelectedOrder(null)
    setOrderSearch('')
    form.resetFields()
    onClose()
  }

  const handleSelectOrder = (order: SalesOrder) => {
    setSelectedOrder(order)
    form.setFieldsValue({
      amount: null,
      paymentDate: dayjs(),
      method: '转账',
      notes: '',
    })
  }

  const handleSubmit = () => {
    if (!selectedOrder) return
    form.validateFields().then(async values => {
      setSubmitting(true)
      try {
        await createPayment({
          salesOrderId: selectedOrder.id,
          amount: values.amount,
          paymentDate: values.paymentDate.format('YYYY-MM-DD'),
          method: values.method,
          notes: values.notes || undefined,
        })
        message.success('收款记录已添加')
        handleClose()
        onSuccess()
      } catch (err) {
        message.error(getErrorMessage(err, '添加失败'))
      } finally {
        setSubmitting(false)
      }
    })
  }

  const kw = orderSearch.trim().toLowerCase()
  const filteredOrders = kw
    ? orders.filter(o =>
        o.orderNo.toLowerCase().includes(kw) ||
        o.customerName?.toLowerCase().includes(kw) ||
        o.customerCode?.toLowerCase().includes(kw)
      )
    : orders

  const orderColumns: ColumnsType<SalesOrder> = [
    { title: '单号', dataIndex: 'orderNo', width: 150 },
    { title: '客户', width: 140, render: (_: unknown, r: SalesOrder) => `${r.customerCode} ${r.customerName}` },
    { title: '日期', dataIndex: 'orderDate', width: 100 },
    { title: '金额', dataIndex: 'totalAmount', width: 100, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '状态', dataIndex: 'paymentStatus', width: 90, align: 'center',
      render: (v: string) => <Tag color={PAY_STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: '', width: 70, align: 'center',
      render: (_: unknown, r: SalesOrder) => (
        <Button
          size="small"
          type={selectedOrder?.id === r.id ? 'primary' : 'default'}
          onClick={() => handleSelectOrder(r)}
        >
          选择
        </Button>
      ),
    },
  ]

  return (
    <Modal
      title="新增收款"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="确认收款"
      cancelText="取消"
      width={700}
      okButtonProps={{ disabled: !selectedOrder }}
      destroyOnClose
    >
      {/* Order search */}
      <div style={{ marginBottom: 12 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索单号、客户名称或编码"
          allowClear
          value={orderSearch}
          onChange={e => setOrderSearch(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        {ordersLoading
          ? <Spin size="small" style={{ display: 'block', margin: '16px auto' }} />
          : (
            <Table
              rowKey="id"
              size="small"
              columns={orderColumns}
              dataSource={filteredOrders}
              pagination={{ pageSize: 5, size: 'small' }}
              rowClassName={(r: SalesOrder) => r.id === selectedOrder?.id ? 'ant-table-row-selected' : ''}
              scroll={{ x: 650 }}
            />
          )
        }
      </div>

      {/* Payment form — only shown after order selected */}
      {selectedOrder && (
        <>
          <div style={{
            background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6,
            padding: '8px 14px', marginBottom: 14, fontSize: 13,
          }}>
            已选：<strong>{selectedOrder.orderNo}</strong>
            &emsp;{selectedOrder.customerCode} {selectedOrder.customerName}
            &emsp;订单金额 <strong>¥{selectedOrder.totalAmount.toFixed(2)}</strong>
            &emsp;<Tag color={PAY_STATUS_COLOR[selectedOrder.paymentStatus]}>{selectedOrder.paymentStatus}</Tag>
          </div>
          <Form form={form} layout="inline" style={{ flexWrap: 'wrap', gap: 8 }}>
            <Form.Item name="amount" label="收款金额" rules={[{ required: true, message: '请输入金额' }]}>
              <InputNumber min={0.01} precision={2} prefix="¥" style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="paymentDate" label="收款日期" rules={[{ required: true }]}>
              <DatePicker style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="method" label="收款方式" initialValue="转账">
              <Select options={METHOD_OPTIONS} style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input style={{ width: 180 }} placeholder="选填" />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  )
}

// ─── Payment List Page ────────────────────────────────────────────────────────

export default function PaymentList() {
  const { message, modal } = App.useApp()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [deleting, setDeleting] = useState<Record<number, boolean>>({})

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

  useEffect(() => { fetchPayments() }, [dateRange])

  const handleDelete = (record: Payment) => {
    modal.confirm({
      title: '确认删除',
      content: `删除「${record.orderNo}」的收款记录 ¥${record.amount.toFixed(2)}？销售单状态将同步更新。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setDeleting(prev => ({ ...prev, [record.id]: true }))
        return deletePayment(record.id)
          .then(() => { message.success('已删除'); fetchPayments() })
          .catch(err => message.error(getErrorMessage(err)))
          .finally(() => setDeleting(prev => ({ ...prev, [record.id]: false })))
      },
    })
  }

  // client-side customer filter
  const kw = customerSearch.trim().toLowerCase()
  const filtered = kw
    ? payments.filter(p =>
        p.customerName?.toLowerCase().includes(kw) ||
        p.orderNo?.toLowerCase().includes(kw)
      )
    : payments

  const totalAmount = filtered.reduce((s, p) => s + p.amount, 0)

  const columns: ColumnsType<Payment> = [
    { title: '日期',   dataIndex: 'paymentDate', width: 110 },
    { title: '单号',   dataIndex: 'orderNo',     width: 160 },
    { title: '客户',   dataIndex: 'customerName',width: 130 },
    {
      title: '金额', dataIndex: 'amount', width: 120, align: 'right',
      render: (v: number) => (
        <span style={{ color: '#389e0d', fontWeight: 600 }}>¥{v.toFixed(2)}</span>
      ),
    },
    { title: '方式',   dataIndex: 'method',   width: 90 },
    { title: '备注',   dataIndex: 'notes',    ellipsis: true },
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          新增收款
        </Button>
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
        dataSource={filtered}
        loading={loading}
        size="small"
        scroll={{ x: 800 }}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
      />

      <AddPaymentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={fetchPayments}
      />
    </>
  )
}

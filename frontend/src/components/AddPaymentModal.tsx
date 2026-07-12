import { useEffect, useState } from 'react'
import {
  Modal, Table, Input, Form, InputNumber, DatePicker, Select, Tag, Spin, App,
} from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getSalesOrders, type SalesOrder } from '@/api/sales'
import { createPayment } from '@/api/payments'
import { getErrorMessage } from '@/utils/error'
import SalesOrderModal from '@/components/SalesOrderModal'

export const METHOD_OPTIONS = [
  { value: '公户',    label: '公户' },
  { value: '银行卡',  label: '银行卡' },
  { value: '微信转账', label: '微信转账' },
  { value: '微信扫码', label: '微信扫码' },
  { value: '支付宝扫码', label: '支付宝扫码' },
  { value: '现金',    label: '现金' },
]

const PAY_STATUS_COLOR: Record<string, string> = {
  '未收款': 'red', '部分收款': 'green', '已收款': 'green',
}

function payStatusLabel(s: string) {
  return s === '部分收款' ? '已付款' : s
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** When provided, pre-selects this order and filters the list to it */
  preselectedOrderId?: number | null
}

export default function AddPaymentModal({ open, onClose, onSuccess, preselectedOrderId }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [viewOrderId, setViewOrderId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setOrdersLoading(true)
    getSalesOrders()
      .then(data => {
        const unpaid = data.filter(o => o.paymentStatus !== '已收款')
        setOrders(unpaid)
        // Auto-select and pre-filter if a specific order was requested
        if (preselectedOrderId) {
          setSelectedKeys([preselectedOrderId])
          const order = unpaid.find(o => o.id === preselectedOrderId)
          if (order) setOrderSearch(order.orderNo)
        }
      })
      .catch(() => {})
      .finally(() => setOrdersLoading(false))
  }, [open])

  const handleClose = () => {
    setSelectedKeys([])
    setOrderSearch('')
    form.resetFields()
    onClose()
  }

  const selectedOrders = orders.filter(o => selectedKeys.includes(o.id))
  const isMulti = selectedKeys.length > 1
  const isSingle = selectedKeys.length === 1
  const selectedTotal = selectedOrders.reduce((s, o) => s + o.totalAmount, 0)

  const handleSubmit = () => {
    if (selectedKeys.length === 0) return
    form.validateFields().then(async values => {
      setSubmitting(true)
      try {
        if (isMulti) {
          for (const order of selectedOrders) {
            await createPayment({
              salesOrderId: order.id,
              amount: order.totalAmount,
              paymentDate: values.paymentDate.format('YYYY-MM-DD'),
              method: values.method,
              notes: values.notes || undefined,
            })
          }
          message.success(`已对 ${selectedOrders.length} 笔订单完成收款`)
        } else {
          await createPayment({
            salesOrderId: selectedOrders[0].id,
            amount: values.amount,
            paymentDate: values.paymentDate.format('YYYY-MM-DD'),
            method: values.method,
            notes: values.notes || undefined,
          })
          message.success('收款记录已添加')
        }
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
    {
      title: '单号', dataIndex: 'orderNo', width: 150,
      render: (v: string, r: SalesOrder) => (
        <span
          style={{ color: '#1677ff', cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); setViewOrderId(r.id) }}
        >{v}</span>
      ),
    },
    { title: '客户', width: 140, render: (_: unknown, r: SalesOrder) => `${r.customerCode} ${r.customerName}` },
    { title: '日期', dataIndex: 'orderDate', width: 100 },
    { title: '金额', dataIndex: 'totalAmount', width: 100, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '状态', dataIndex: 'paymentStatus', width: 90, align: 'center',
      render: (v: string) => <Tag color={PAY_STATUS_COLOR[v] ?? 'default'}>{payStatusLabel(v)}</Tag>,
    },
  ]

  return (
    <>
      <Modal
        title="新增收款"
        open={open}
        onCancel={handleClose}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText="确认收款"
        cancelText="取消"
        width={720}
        okButtonProps={{ disabled: selectedKeys.length === 0 }}
        destroyOnClose
      >
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
                pagination={{ pageSize: 10, size: 'small' }}
                scroll={{ x: 600 }}
                rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys: selectedKeys,
                  onChange: keys => setSelectedKeys(keys as number[]),
                }}
              />
            )
          }
        </div>

        {selectedKeys.length > 0 && (
          <>
            <div style={{
              background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6,
              padding: '8px 14px', marginBottom: 14, fontSize: 13,
            }}>
              {isMulti ? (
                <>已选 <strong>{selectedKeys.length}</strong> 笔订单，合计 <strong>¥{selectedTotal.toFixed(2)}</strong>（将全额收款）</>
              ) : (
                <>已选：<strong>{selectedOrders[0].orderNo}</strong>
                  &emsp;{selectedOrders[0].customerCode} {selectedOrders[0].customerName}
                  &emsp;订单金额 <strong>¥{selectedOrders[0].totalAmount.toFixed(2)}</strong>
                  &emsp;<Tag color={PAY_STATUS_COLOR[selectedOrders[0].paymentStatus]}>{payStatusLabel(selectedOrders[0].paymentStatus)}</Tag>
                </>
              )}
            </div>
            <Form form={form} layout="inline" style={{ flexWrap: 'wrap', gap: 8 }}>
              {isSingle && (
                <Form.Item name="amount" label="收款金额" rules={[{ required: true, message: '请输入金额' }]}>
                  <InputNumber min={0.01} precision={2} prefix="¥" style={{ width: 150 }} />
                </Form.Item>
              )}
              <Form.Item name="paymentDate" label="收款日期" rules={[{ required: true }]}>
                <DatePicker defaultValue={dayjs()} style={{ width: 140 }} />
              </Form.Item>
              <Form.Item name="method" label="收款方式" initialValue="公户">
                <Select options={METHOD_OPTIONS} style={{ width: 120 }} />
              </Form.Item>
              <Form.Item name="notes" label="备注">
                <Input style={{ width: 180 }} placeholder="选填" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      <SalesOrderModal orderId={viewOrderId} onClose={() => setViewOrderId(null)} />
    </>
  )
}

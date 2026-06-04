import { useEffect, useState } from 'react'
import { Table, Button, Select, DatePicker, Tag, App } from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getSalesOrders, type SalesOrder, type SalesOrderItem } from '@/api/sales'
import { getCustomers, type Customer } from '@/api/customers'
import { getErrorMessage } from '@/utils/error'
import styles from './Sales.module.css'

const PAY_STATUS_MAP: Record<string, { color: string; label: string }> = {
  unpaid:  { color: 'red',    label: '未收款' },
  partial: { color: 'orange', label: '部分收款' },
  paid:    { color: 'green',  label: '已收款' },
}

export default function SalesOrderList() {
  const navigate = useNavigate()
  const { message } = App.useApp()

  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)

  const [customerId, setCustomerId] = useState<number | undefined>()
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [payStatus, setPayStatus] = useState<string | undefined>()

  const fetchOrders = () => {
    setLoading(true)
    getSalesOrders({
      customer_id: customerId,
      start_date: dateRange?.[0].format('YYYY-MM-DD'),
      end_date:   dateRange?.[1].format('YYYY-MM-DD'),
      pay_status: payStatus,
    })
      .then(setOrders)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    getCustomers().then(setCustomers).catch(() => {})
  }, [])

  useEffect(() => { fetchOrders() }, [customerId, dateRange, payStatus])

  const columns: ColumnsType<SalesOrder> = [
    { title: '单号', dataIndex: 'order_no', width: 160 },
    { title: '客户', dataIndex: 'customer_name', width: 120 },
    { title: '日期', dataIndex: 'order_date', width: 110 },
    {
      title: '合计金额', dataIndex: 'total_amount', width: 110, align: 'right',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '收款状态', dataIndex: 'pay_status', width: 100, align: 'center',
      render: (v: string) => {
        const s = PAY_STATUS_MAP[v] ?? { color: 'default', label: v }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
    { title: '备注', dataIndex: 'notes', ellipsis: true },
    {
      title: '操作', width: 80, align: 'center',
      render: (_: unknown, record: SalesOrder) => (
        <Button
          type="link" size="small" icon={<EyeOutlined />}
          onClick={() => navigate(`/sales/orders/${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ]

  const expandedRowRender = (record: SalesOrder) => {
    const itemCols: ColumnsType<SalesOrderItem> = [
      { title: '编码', dataIndex: 'product_code', width: 100 },
      { title: '货品名称', dataIndex: 'product_name' },
      { title: '供应商', dataIndex: 'supplier_name', width: 120 },
      { title: '数量', dataIndex: 'qty', width: 80, align: 'center' },
      { title: '单价', dataIndex: 'unit_price', width: 90, align: 'right', render: (v: number) => `¥${v}` },
      { title: '折扣', dataIndex: 'discount', width: 70, align: 'right', render: (v: number) => `${v ?? 100}%` },
      { title: '金额', dataIndex: 'amount', width: 100, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    ]
    return (
      <Table
        rowKey="product_code"
        columns={itemCols}
        dataSource={record.items}
        pagination={false}
        size="small"
      />
    )
  }

  return (
    <>
      <div className={styles.pageTitle}>销售单据</div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Select
            allowClear placeholder="选择客户"
            style={{ width: 160 }}
            options={customers.map(c => ({ value: c.id, label: `${c.code} ${c.name}` }))}
            onChange={v => setCustomerId(v)}
          />
          <DatePicker.RangePicker
            value={dateRange}
            onChange={v => setDateRange(v as [Dayjs, Dayjs] | null)}
            presets={[
              { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
              { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
            ]}
          />
          <Select
            allowClear placeholder="收款状态"
            style={{ width: 120 }}
            options={[
              { value: 'unpaid',  label: '未收款' },
              { value: 'partial', label: '部分收款' },
              { value: 'paid',    label: '已收款' },
            ]}
            onChange={v => setPayStatus(v)}
          />
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/sales/orders/new')}>
          新建销售单
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={orders}
        loading={loading}
        expandable={{ expandedRowRender }}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
        size="small"
      />
    </>
  )
}

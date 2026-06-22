import { useEffect, useState } from 'react'
import { Table, Button, Select, DatePicker, Input, Tag, App, Spin } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getSalesOrders, getSalesOrder, deleteSalesOrder, type SalesOrder, type SalesOrderItem } from '@/api/sales'
import { getErrorMessage } from '@/utils/error'
import styles from './Sales.module.css'

const PAY_STATUS_MAP: Record<string, { color: string }> = {
  '未收款':  { color: 'red'    },
  '部分收款': { color: 'orange' },
  '已收款':  { color: 'green'  },
}

export default function SalesOrderList() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()

  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>()

  const [itemsMap, setItemsMap] = useState<Record<number, SalesOrderItem[]>>({})
  const [expandLoading, setExpandLoading] = useState<Record<number, boolean>>({})
  const [deleting, setDeleting] = useState<Record<number, boolean>>({})

  const fetchOrders = () => {
    setLoading(true)
    getSalesOrders({
      startDate: dateRange?.[0].format('YYYY-MM-DD'),
      endDate:   dateRange?.[1].format('YYYY-MM-DD'),
      paymentStatus,
    })
      .then(setOrders)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders() }, [dateRange, paymentStatus])

  const handleExpand = (expanded: boolean, record: SalesOrder) => {
    if (!expanded || itemsMap[record.id] !== undefined) return
    setExpandLoading(prev => ({ ...prev, [record.id]: true }))
    getSalesOrder(record.id)
      .then(order => setItemsMap(prev => ({ ...prev, [record.id]: order.items ?? [] })))
      .catch(() => setItemsMap(prev => ({ ...prev, [record.id]: [] })))
      .finally(() => setExpandLoading(prev => ({ ...prev, [record.id]: false })))
  }

  const handleDelete = (record: SalesOrder) => {
    modal.confirm({
      title: '确认删除',
      content: `删除销售单「${record.orderNo}」？库存将同步回退，此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setDeleting(prev => ({ ...prev, [record.id]: true }))
        return deleteSalesOrder(record.id)
          .then(() => {
            message.success('删除成功')
            fetchOrders()
          })
          .catch(err => message.error(getErrorMessage(err)))
          .finally(() => setDeleting(prev => ({ ...prev, [record.id]: false })))
      },
    })
  }

  const kw = customerSearch.trim().toLowerCase()
  const filteredOrders = kw
    ? orders.filter(o =>
        o.customerName?.toLowerCase().includes(kw) ||
        o.customerCode?.toLowerCase().includes(kw)
      )
    : orders

  const columns: ColumnsType<SalesOrder> = [
    { title: '日期',     dataIndex: 'orderDate',    width: 110, align: 'center' },
    { title: '客户', width: 150, align: 'center', render: (_: unknown, r: SalesOrder) => `${r.customerCode} ${r.customerName}` },
    { title: '单号',     dataIndex: 'orderNo',      width: 160, align: 'center' },
    { title: '数量',     dataIndex: 'totalQty',     width: 80,  align: 'center' },
    {
      title: '合计金额', dataIndex: 'totalAmount', width: 110, align: 'center',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    { title: '件数',     dataIndex: 'totalPieces',  width: 80,  align: 'center' },
    {
      title: '收款状态', dataIndex: 'paymentStatus', width: 100, align: 'center',
      render: (v: string) => {
        const s = PAY_STATUS_MAP[v] ?? { color: 'default' }
        return <Tag color={s.color}>{v}</Tag>
      },
    },
    {
      title: '总毛利', dataIndex: 'totalProfit', width: 110, align: 'center',
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#389e0d' : '#cf1322', fontWeight: 600 }}>
          {v >= 0 ? '+' : ''}¥{v.toFixed(2)}
        </span>
      ),
    },
    {
      title: '操作', width: 140, fixed: 'right', align: 'center',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button type="link" size="small"
            onClick={() => navigate(`/sales/orders/${record.id}`)}>查看</Button>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/sales/orders/${record.id}/edit`)} />
          <Button type="link" size="small" danger icon={<DeleteOutlined />}
            loading={deleting[record.id]}
            onClick={() => handleDelete(record)} />
        </div>
      ),
    },
  ]

  const itemColumns: ColumnsType<SalesOrderItem> = [
    { title: '编码',     dataIndex: 'productCode',  width: 100, align: 'center' },
    { title: '货品名称', dataIndex: 'productName',  width: 160, align: 'center' },
    { title: '供应商',   dataIndex: 'supplierName', width: 120, align: 'center' },
    { title: '单位',     dataIndex: 'unit',         width: 60,  align: 'center' },
    { title: '数量',     dataIndex: 'qty',          width: 70,  align: 'center' },
    { title: '件数',     dataIndex: 'pieces',       width: 70,  align: 'center' },
    { title: '进价',     dataIndex: 'costPrice',    width: 90,  align: 'center',  render: (v: number | null) => v != null ? `¥${v.toFixed(2)}` : '—' },
    { title: '单价',     dataIndex: 'unitPrice',    width: 90,  align: 'center',  render: (v: number) => `¥${v}` },
    { title: '折扣',     dataIndex: 'discount',     width: 65,  align: 'center', render: (v: number) => `${v ?? 100}%` },
    { title: '折后金额', dataIndex: 'finalAmount',  width: 110, align: 'center',  render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '毛利', width: 110, align: 'center',
      render: (_: unknown, r: SalesOrderItem) => {
        r.costPrice ??= 0
        const profit = +(r.finalAmount - r.costPrice * r.qty).toFixed(2)
        return (
          <span style={{ color: profit >= 0 ? '#389e0d' : '#cf1322', fontWeight: 600 }}>
            {profit >= 0 ? '+' : ''}¥{profit.toFixed(2)}
          </span>
        )
      },
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>销售单据</div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="搜索客户名称或编码"
            prefix={<SearchOutlined />}
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
          <Select
            allowClear placeholder="收款状态"
            style={{ width: 120 }}
            options={[
              { value: '未收款',  label: '未收款' },
              { value: '部分收款', label: '部分收款' },
              { value: '已收款',  label: '已收款' },
            ]}
            onChange={v => setPaymentStatus(v)}
          />
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/sales/orders/new')}>
          新建销售单
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredOrders}
        loading={loading}
        size="middle"
        scroll={{ x: 1050 }}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
        summary={pageData => {
          const qty    = pageData.reduce((s, r) => s + (r.totalQty    ?? 0), 0)
          const pieces = pageData.reduce((s, r) => s + (r.totalPieces ?? 0), 0)
          const amount = pageData.reduce((s, r) => s + (r.totalAmount  ?? 0), 0)
          const profit = pageData.reduce((s, r) => s + (r.totalProfit  ?? 0), 0)
          return (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={4} align="right">本页合计</Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="center">{qty}</Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="center">¥{amount.toFixed(2)}</Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="center">{pieces}</Table.Summary.Cell>
                <Table.Summary.Cell index={6} />
                <Table.Summary.Cell index={7} align="center">
                  <span style={{ color: profit >= 0 ? '#389e0d' : '#cf1322' }}>
                    {profit >= 0 ? '+' : ''}¥{profit.toFixed(2)}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} />
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
        expandable={{
          onExpand: handleExpand,
          expandedRowRender: record => {
            if (expandLoading[record.id]) {
              return <Spin size="small" style={{ padding: '8px 16px', display: 'block' }} />
            }
            return (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={itemsMap[record.id] ?? []}
                columns={itemColumns}
                scroll={{ x: 860 }}
              />
            )
          },
        }}
      />
    </>
  )
}

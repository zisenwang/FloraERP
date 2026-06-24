import { useEffect, useState } from 'react'
import { Table, Button, DatePicker, Input, Tag, Select, App, Spin } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import {
  getPurchaseOrders, getPurchaseOrder, deletePurchaseOrder,
  getPurchaseReturns, getPurchaseReturn, deletePurchaseReturn,
  type PurchaseOrder, type PurchaseOrderItem,
  type PurchaseReturn, type PurchaseReturnItem,
} from '@/api/purchase'
import { getErrorMessage } from '@/utils/error'
import { PAGE_SIZE } from '@/constants/pagination'
import styles from './Purchase.module.css'

const { RangePicker } = DatePicker

const STATUS_COLOR: Record<string, string> = {
  '已入库': 'green',
  '草稿':   'orange',
}

interface UnifiedRow {
  _key: string
  rowType: 'order' | 'return'
  id: number
  date: string
  time: string
  no: string
  supplierName: string
  supplierCode: string
  supplierId: number
  qty: number
  amount: number
  pieces: number
  status?: string
}

function toUnified(o: PurchaseOrder): UnifiedRow {
  return {
    _key: `order-${o.id}`,
    rowType: 'order',
    id: o.id,
    date: o.orderDate,
    time: o.createdAt,
    no: o.orderNo,
    supplierName: o.supplierName,
    supplierCode: o.supplierCode,
    supplierId: o.supplierId,
    qty: o.totalQty,
    amount: o.totalAmount,
    pieces: o.totalPieces ?? 0,
    status: o.status,
  }
}

function toUnifiedReturn(r: PurchaseReturn): UnifiedRow {
  return {
    _key: `return-${r.id}`,
    rowType: 'return',
    id: r.id,
    date: r.returnDate,
    time: r.createdAt,
    no: r.returnNo,
    supplierName: r.supplierName,
    supplierCode: r.supplierCode,
    supplierId: r.supplierId,
    qty: r.totalQty,
    amount: r.totalAmount,
    pieces: r.totalPieces ?? 0,
  }
}

export default function PurchaseOrderList() {
  const { message, modal } = App.useApp()
  const navigate = useNavigate()

  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [returns, setReturns] = useState<PurchaseReturn[]>([])
  const [loading, setLoading] = useState(false)
  const [supplierSearch, setSupplierSearch] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(1, 'month').startOf('month'),
    dayjs().endOf('month'),
  ])
  const [statusFilter, setStatusFilter] = useState<string | undefined>()

  const [orderItemsMap, setOrderItemsMap] = useState<Record<number, PurchaseOrderItem[]>>({})
  const [returnItemsMap, setReturnItemsMap] = useState<Record<number, PurchaseReturnItem[]>>({})
  const [expandLoading, setExpandLoading] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})

  const fetchAll = (range = dateRange, sf = statusFilter) => {
    setLoading(true)
    const startDate = range[0].format('YYYY-MM-DD')
    const endDate   = range[1].format('YYYY-MM-DD')
    const fetchOrders = sf !== '退货'
      ? getPurchaseOrders({ startDate, endDate })
      : Promise.resolve([] as PurchaseOrder[])
    const fetchReturns = sf !== '已入库'
      ? getPurchaseReturns({ startDate, endDate })
      : Promise.resolve([] as PurchaseReturn[])
    Promise.all([fetchOrders, fetchReturns])
      .then(([o, r]) => { setOrders(o); setReturns(r) })
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll(dateRange) }, [statusFilter])

  const handleExpand = (expanded: boolean, row: UnifiedRow) => {
    if (!expanded) return
    if (row.rowType === 'order') {
      if (orderItemsMap[row.id] !== undefined) return
      setExpandLoading(prev => ({ ...prev, [row._key]: true }))
      getPurchaseOrder(row.id)
        .then(o => setOrderItemsMap(prev => ({ ...prev, [row.id]: o.items ?? [] })))
        .catch(() => setOrderItemsMap(prev => ({ ...prev, [row.id]: [] })))
        .finally(() => setExpandLoading(prev => ({ ...prev, [row._key]: false })))
    } else {
      if (returnItemsMap[row.id] !== undefined) return
      setExpandLoading(prev => ({ ...prev, [row._key]: true }))
      getPurchaseReturn(row.id)
        .then(r => setReturnItemsMap(prev => ({ ...prev, [row.id]: r.items ?? [] })))
        .catch(() => setReturnItemsMap(prev => ({ ...prev, [row.id]: [] })))
        .finally(() => setExpandLoading(prev => ({ ...prev, [row._key]: false })))
    }
  }

  const handleDelete = (row: UnifiedRow) => {
    const label = row.rowType === 'order' ? `采购单「${row.no}」` : `退货单「${row.no}」`
    const detail = row.rowType === 'order' ? '库存将同步回退，此操作不可撤销。' : '库存将同步恢复，此操作不可撤销。'
    modal.confirm({
      title: '确认删除',
      content: `删除${label}？${detail}`,
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => {
        setDeleting(prev => ({ ...prev, [row._key]: true }))
        const req = row.rowType === 'order'
          ? deletePurchaseOrder(row.id)
          : deletePurchaseReturn(row.id)
        return req
          .then(() => { message.success('删除成功'); fetchAll() })
          .catch(err => message.error(getErrorMessage(err)))
          .finally(() => setDeleting(prev => ({ ...prev, [row._key]: false })))
      },
    })
  }

  const kw = supplierSearch.trim().toLowerCase()
  const combined: UnifiedRow[] = [
    ...orders.map(toUnified),
    ...returns.map(toUnifiedReturn),
  ]
    .filter(r => !kw || r.supplierName?.toLowerCase().includes(kw) || r.supplierCode?.toLowerCase().includes(kw))
    .sort((a, b) => b.time.localeCompare(a.time))

  const columns: ColumnsType<UnifiedRow> = [
    { title: '日期', dataIndex: 'date', width: 110, align: 'center' },
    {
      title: '供应商', width: 150, align: 'center',
      render: (_, r) => `${r.supplierCode} ${r.supplierName}`,
    },
    {
      title: '单号', width: 175, align: 'center',
      render: (_, r) => (
        <span>
          {r.rowType === 'return' && <Tag color="orange" style={{ marginRight: 4 }}>退</Tag>}
          {r.no}
        </span>
      ),
    },
    { title: '数量', dataIndex: 'qty', width: 90, align: 'center' },
    {
      title: '金额', dataIndex: 'amount', width: 110, align: 'center',
      render: (v: number, r) => (
        <span style={{ color: r.rowType === 'return' ? '#cf1322' : undefined }}>
          {r.rowType === 'return' ? '-' : ''}¥{v.toLocaleString()}
        </span>
      ),
    },
    {
      title: '件数', dataIndex: 'pieces', width: 80, align: 'center',
      render: (v: number) => v || '—',
    },
    {
      title: '状态', width: 90, align: 'center',
      render: (_, r) => {
        if (r.rowType === 'return') return <Tag color="default">退货</Tag>
        return <Tag color={STATUS_COLOR[r.status ?? ''] ?? 'default'}>{r.status}</Tag>
      },
    },
    {
      title: '操作', width: 130, fixed: 'right', align: 'center',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button type="link" size="small"
            onClick={() => navigate(row.rowType === 'order' ? `/purchase/orders/${row.id}` : `/purchase/returns/${row.id}`)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => navigate(row.rowType === 'order' ? `/purchase/orders/${row.id}/edit` : `/purchase/returns/${row.id}/edit`)} />
          <Button type="link" size="small" danger icon={<DeleteOutlined />}
            loading={deleting[row._key]}
            onClick={() => handleDelete(row)} />
        </div>
      ),
    },
  ]

  const orderItemColumns: ColumnsType<PurchaseOrderItem> = [
    { title: '编码',     dataIndex: 'productCode', width: 100, align: 'center' },
    { title: '货品名称', dataIndex: 'productName',  width: 160, align: 'center' },
    { title: '品类',     dataIndex: 'category',     width: 90,  align: 'center', render: (v: string) => v ?? '—' },
    { title: '等级',     dataIndex: 'grade',        width: 70,  align: 'center', render: (v: string) => v ?? '—' },
    { title: '单位',     dataIndex: 'unit',         width: 60,  align: 'center' },
    { title: '数量',     dataIndex: 'qty',          width: 70,  align: 'center' },
    { title: '件数',     dataIndex: 'pieces',       width: 70,  align: 'center', render: (v: number) => v || '—' },
    { title: '单价',     dataIndex: 'unitPrice',    width: 90,  align: 'center', render: (v: number) => `¥${v}` },
    { title: '金额',     dataIndex: 'amount',       width: 100, align: 'center', render: (v: number) => `¥${v.toLocaleString()}` },
    { title: '折扣',     dataIndex: 'discount',     width: 65,  align: 'center', render: (v: number) => `${v}%` },
    { title: '折后金额', dataIndex: 'finalAmount',  width: 110, align: 'center', render: (v: number) => `¥${v.toLocaleString()}` },
  ]

  const returnItemColumns: ColumnsType<PurchaseReturnItem> = [
    { title: '编码',     dataIndex: 'productCode', width: 100, align: 'center' },
    { title: '货品名称', dataIndex: 'productName', width: 160, align: 'center' },
    { title: '品类',     dataIndex: 'category',    width: 90,  align: 'center', render: (v: string) => v ?? '—' },
    { title: '等级',     dataIndex: 'grade',       width: 70,  align: 'center', render: (v: string) => v ?? '—' },
    { title: '单位',     dataIndex: 'unit',        width: 60,  align: 'center' },
    { title: '数量',     dataIndex: 'qty',         width: 70,  align: 'center' },
    { title: '件数',     dataIndex: 'pieces',      width: 70,  align: 'center', render: (v: number) => v || '—' },
    { title: '单价',     dataIndex: 'unitPrice',   width: 90,  align: 'center', render: (v: number) => `¥${v}` },
    { title: '金额',     dataIndex: 'amount',      width: 100, align: 'center', render: (v: number) => `¥${v.toLocaleString()}` },
  ]

  return (
    <>
      <div className={styles.pageTitle}>采购单据</div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="搜索供应商名称或编码"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 200 }}
            value={supplierSearch}
            onChange={e => setSupplierSearch(e.target.value)}
          />
          <RangePicker
            value={dateRange}
            presets={[
              { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
              { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
            ]}
            onChange={v => {
              const range: [Dayjs, Dayjs] = v && v[0] && v[1]
                ? [v[0], v[1]]
                : [dayjs().subtract(1, 'month').startOf('month'), dayjs().endOf('month')]
              setDateRange(range)
              fetchAll(range)
            }}
          />
          <Select
            allowClear placeholder="状态"
            style={{ width: 110 }}
            options={[
              { value: '已入库', label: '已入库' },
              { value: '退货',   label: '退货' },
            ]}
            onChange={v => setStatusFilter(v)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchase/orders/new')}>
            采购入库
          </Button>
          <Button onClick={() => navigate('/purchase/returns/new')}>
            新增退货
          </Button>
        </div>
      </div>

      <Table
        rowKey="_key"
        columns={columns}
        dataSource={combined}
        loading={loading}
        size="middle"
        scroll={{ x: 750 }}
        pagination={{ pageSize: PAGE_SIZE, showTotal: total => `共 ${total} 条` }}
        summary={pageData => {
          const calc = (rows: UnifiedRow[]) => {
            const orders  = rows.filter(r => r.rowType === 'order')
            const returns = rows.filter(r => r.rowType === 'return')
            return {
              qty:    orders.reduce((s, r) => s + (r.qty    ?? 0), 0) - returns.reduce((s, r) => s + (r.qty    ?? 0), 0),
              pieces: orders.reduce((s, r) => s + (r.pieces ?? 0), 0) - returns.reduce((s, r) => s + (r.pieces ?? 0), 0),
              amount: orders.reduce((s, r) => s + (r.amount ?? 0), 0) - returns.reduce((s, r) => s + (r.amount ?? 0), 0),
            }
          }
          const page  = calc(pageData as UnifiedRow[])
          const total = calc(combined)
          const SummaryRow = ({ label, d, bg }: { label: string; d: typeof page; bg: string }) => (
            <Table.Summary.Row style={{ background: bg, fontWeight: 600 }}>
              <Table.Summary.Cell index={0} colSpan={4} align="right">{label}</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="center">{d.qty}</Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="center">¥{d.amount.toFixed(2)}</Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="center">{d.pieces}</Table.Summary.Cell>
              <Table.Summary.Cell index={6} />
              <Table.Summary.Cell index={7} />
            </Table.Summary.Row>
          )
          return (
            <Table.Summary fixed>
              <SummaryRow label="本页合计" d={page}  bg="#fafafa" />
              <SummaryRow label="全部合计" d={total} bg="#f0f5ff" />
            </Table.Summary>
          )
        }}
        expandable={{
          onExpand: handleExpand,
          expandedRowRender: row => {
            if (expandLoading[row._key]) {
              return <Spin size="small" style={{ padding: '8px 16px', display: 'block' }} />
            }
            if (row.rowType === 'order') {
              return (
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={orderItemsMap[row.id] ?? []}
                  columns={orderItemColumns}
                  scroll={{ x: 920 }}
                />
              )
            }
            return (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={returnItemsMap[row.id] ?? []}
                columns={returnItemColumns}
                scroll={{ x: 740 }}
              />
            )
          },
        }}
      />
    </>
  )
}

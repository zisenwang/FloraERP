import { useEffect, useState } from 'react'
import { Table, Button, DatePicker, Input, App, Spin } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import {
  getSalesReturns, getSalesReturn, deleteSalesReturn,
  type SalesReturn, type SalesReturnItem,
} from '@/api/sales'
import { getErrorMessage } from '@/utils/error'

const { RangePicker } = DatePicker

export default function SalesReturnList() {
  const { message, modal } = App.useApp()
  const navigate = useNavigate()

  const [returns, setReturns] = useState<SalesReturn[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<[string, string] | undefined>()
  const [itemsMap, setItemsMap] = useState<Record<number, SalesReturnItem[]>>({})
  const [expandLoading, setExpandLoading] = useState<Record<number, boolean>>({})
  const [deleting, setDeleting] = useState<Record<number, boolean>>({})

  const fetchReturns = (range?: [string, string], kw?: string) => {
    setLoading(true)
    getSalesReturns({ startDate: range?.[0], endDate: range?.[1], search: kw || undefined })
      .then(setReturns)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReturns() }, [])

  const handleDelete = (record: SalesReturn) => {
    modal.confirm({
      title: '确认删除',
      content: `删除退货单「${record.returnNo}」？库存将同步扣减，此操作不可撤销。`,
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => {
        setDeleting(prev => ({ ...prev, [record.id]: true }))
        return deleteSalesReturn(record.id)
          .then(() => { message.success('删除成功'); fetchReturns(dateRange) })
          .catch(err => message.error(getErrorMessage(err)))
          .finally(() => setDeleting(prev => ({ ...prev, [record.id]: false })))
      },
    })
  }

  const handleExpand = (expanded: boolean, record: SalesReturn) => {
    if (!expanded || itemsMap[record.id] !== undefined) return
    setExpandLoading(prev => ({ ...prev, [record.id]: true }))
    getSalesReturn(record.id)
      .then(r => setItemsMap(prev => ({ ...prev, [record.id]: r.items ?? [] })))
      .catch(() => setItemsMap(prev => ({ ...prev, [record.id]: [] })))
      .finally(() => setExpandLoading(prev => ({ ...prev, [record.id]: false })))
  }

  const columns: ColumnsType<SalesReturn> = [
    { title: '单号', dataIndex: 'returnNo', width: 180, align: 'center' },
    { title: '客户', width: 160, align: 'center', render: (_, r) => `${r.customerCode} ${r.customerName}` },
    { title: '日期', dataIndex: 'returnDate', width: 110, align: 'center' },
    { title: '数量', dataIndex: 'totalQty', width: 80, align: 'center' },
    { title: '件数', dataIndex: 'totalPieces', width: 75, align: 'center', render: (v: number) => v || '—' },
    { title: '金额', dataIndex: 'totalAmount', width: 110, align: 'center', render: (v: number) => `¥${v.toLocaleString()}` },
    {
      title: '操作', width: 130, fixed: 'right', align: 'center',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button type="link" size="small" onClick={() => navigate(`/sales/returns/${record.id}`)}>查看</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/sales/returns/${record.id}/edit`)} />
          <Button type="link" size="small" danger icon={<DeleteOutlined />} loading={deleting[record.id]} onClick={() => handleDelete(record)} />
        </div>
      ),
    },
  ]

  const itemColumns: ColumnsType<SalesReturnItem> = [
    { title: '编码', dataIndex: 'productCode', width: 100, align: 'center' },
    { title: '货品名称', dataIndex: 'productName', width: 160, align: 'center' },
    { title: '单位', dataIndex: 'unit', width: 60, align: 'center' },
    { title: '数量', dataIndex: 'qty', width: 70, align: 'center' },
    { title: '件数', dataIndex: 'pieces', width: 70, align: 'center', render: (v: number) => v || '—' },
    { title: '单价', dataIndex: 'unitPrice', width: 90, align: 'center', render: (v: number) => `¥${v}` },
    { title: '金额', dataIndex: 'amount', width: 100, align: 'center', render: (v: number) => `¥${v.toLocaleString()}` },
  ]

  return (
    <>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>销售退货</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="搜索单号、客户、货品名称/编码"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 260 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={() => fetchReturns(dateRange, search)}
            onClear={() => fetchReturns(dateRange, '')}
          />
          <Button onClick={() => fetchReturns(dateRange, search)}>搜索</Button>
          <RangePicker
            onChange={(_, strs) => {
              const range = strs[0] && strs[1] ? [strs[0], strs[1]] as [string, string] : undefined
              setDateRange(range)
              fetchReturns(range, search)
            }}
          />
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/sales/returns/new')}>
          新增退货
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={returns}
        loading={loading}
        size="middle"
        scroll={{ x: 700 }}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
        expandable={{
          onExpand: handleExpand,
          expandedRowRender: record => {
            if (expandLoading[record.id]) return <Spin size="small" style={{ padding: '8px 16px', display: 'block' }} />
            return (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={itemsMap[record.id] ?? []}
                columns={itemColumns}
                scroll={{ x: 650 }}
              />
            )
          },
        }}
      />
    </>
  )
}

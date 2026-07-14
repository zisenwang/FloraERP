import { useEffect, useState } from 'react'
import { Table, Button, DatePicker, Input, App, Spin, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, StopOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import {
  getPurchaseReturns, getPurchaseReturn, voidPurchaseReturn,
  type PurchaseReturn, type PurchaseReturnItem,
} from '@/api/purchase'
import { getErrorMessage } from '@/utils/error'
import { PAGE_SIZE } from '@/constants/pagination'
import styles from './Purchase.module.css'

const { RangePicker } = DatePicker

export default function PurchaseReturnList() {
  const { message } = App.useApp()
  const navigate = useNavigate()

  const [returns, setReturns] = useState<PurchaseReturn[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<[string, string] | undefined>()
  const [itemsMap, setItemsMap] = useState<Record<number, PurchaseReturnItem[]>>({})
  const [expandLoading, setExpandLoading] = useState<Record<number, boolean>>({})
  const [voiding, setVoiding] = useState<Record<number, boolean>>({})

  const fetchReturns = (range?: [string, string], kw?: string) => {
    setLoading(true)
    getPurchaseReturns({ startDate: range?.[0], endDate: range?.[1], search: kw || undefined })
      .then(setReturns)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReturns() }, [])

  const handleVoid = async (record: PurchaseReturn) => {
    setVoiding(prev => ({ ...prev, [record.id]: true }))
    try {
      await voidPurchaseReturn(record.id)
      message.success('已作废')
      fetchReturns(dateRange, search)
    } catch (err) {
      message.error(getErrorMessage(err))
    } finally {
      setVoiding(prev => ({ ...prev, [record.id]: false }))
    }
  }

  const handleExpand = (expanded: boolean, record: PurchaseReturn) => {
    if (!expanded || itemsMap[record.id] !== undefined) return
    setExpandLoading(prev => ({ ...prev, [record.id]: true }))
    getPurchaseReturn(record.id)
      .then(r => setItemsMap(prev => ({ ...prev, [record.id]: r.items ?? [] })))
      .catch(() => setItemsMap(prev => ({ ...prev, [record.id]: [] })))
      .finally(() => setExpandLoading(prev => ({ ...prev, [record.id]: false })))
  }

  const isVoided = (r: PurchaseReturn) => r.notes?.startsWith('作废_') ?? false

  const columns: ColumnsType<PurchaseReturn> = [
    { title: '单号', dataIndex: 'returnNo', width: 180, align: 'center' },
    { title: '供应商', width: 160, align: 'center', render: (_, r) => `${r.supplierCode} ${r.supplierName}` },
    { title: '日期', dataIndex: 'returnDate', width: 110, align: 'center' },
    { title: '数量', dataIndex: 'totalQty', width: 80, align: 'center' },
    { title: '件数', dataIndex: 'totalPieces', width: 75, align: 'center', render: (v: number) => v || '—' },
    { title: '金额', dataIndex: 'totalAmount', width: 110, align: 'center', render: (v: number) => `¥${v.toLocaleString()}` },
    {
      title: '操作', width: 110, fixed: 'right', align: 'center',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button type="link" size="small" onClick={() => navigate(`/purchase/returns/${record.id}`)}>查看</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/purchase/returns/${record.id}/edit`)} />
          {!isVoided(record) && (
            <Popconfirm
              title="作废此退货单？"
              description="作废后数量归零，单据保留，此操作不可撤销"
              okText="确认作废" cancelText="取消" okButtonProps={{ danger: true }}
              onConfirm={() => handleVoid(record)}
            >
              <Button type="link" size="small" danger icon={<StopOutlined />} loading={voiding[record.id]} />
            </Popconfirm>
          )}
        </div>
      ),
    },
  ]

  const itemColumns: ColumnsType<PurchaseReturnItem> = [
    { title: '编码', dataIndex: 'productCode', width: 100, align: 'center' },
    { title: '货品名称', dataIndex: 'productName', width: 160, align: 'center' },
    { title: '品类', dataIndex: 'category', width: 90, align: 'center', render: v => v ?? '—' },
    { title: '等级', dataIndex: 'grade', width: 70, align: 'center', render: v => v ?? '—' },
    { title: '单位', dataIndex: 'unit', width: 60, align: 'center' },
    { title: '数量', dataIndex: 'qty', width: 70, align: 'center' },
    { title: '件数', dataIndex: 'pieces', width: 70, align: 'center', render: (v: number) => v || '—' },
    { title: '单价', dataIndex: 'unitPrice', width: 90, align: 'center', render: (v: number) => `¥${v}` },
    { title: '金额', dataIndex: 'amount', width: 100, align: 'center', render: (v: number) => `¥${v.toLocaleString()}` },
  ]

  return (
    <>
      <div className={styles.pageTitle}>采购退货</div>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="搜索单号、供应商、货品名称/编码"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 260 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={() => fetchReturns(dateRange, search)}
            onClear={() => fetchReturns(dateRange, '')}
          />
          <RangePicker
            onChange={(_, strs) => {
              const range = strs[0] && strs[1] ? [strs[0], strs[1]] as [string, string] : undefined
              setDateRange(range)
              fetchReturns(range, search)
            }}
          />
          <Button onClick={() => fetchReturns(dateRange, search)}>搜索</Button>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchase/returns/new')}>
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
        pagination={{ pageSize: PAGE_SIZE, showTotal: total => `共 ${total} 条` }}
        summary={pageData => {
          const calc = (rows: readonly PurchaseReturn[]) => ({
            qty:    rows.reduce((s, r) => s + (r.totalQty    ?? 0), 0),
            pieces: rows.reduce((s, r) => s + (r.totalPieces ?? 0), 0),
            amount: rows.reduce((s, r) => s + (r.totalAmount ?? 0), 0),
          })
          const page  = calc(pageData)
          const total = calc(returns)
          const SummaryRow = ({ label, d, bg }: { label: string; d: ReturnType<typeof calc>; bg: string }) => (
            <Table.Summary.Row style={{ background: bg, fontWeight: 600 }}>
              <Table.Summary.Cell index={0} colSpan={3} align="right">{label}</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="center">{d.qty}</Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="center">{d.pieces || '—'}</Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="center">¥{d.amount.toFixed(2)}</Table.Summary.Cell>
              <Table.Summary.Cell index={6} />
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
          expandedRowRender: record => {
            if (expandLoading[record.id]) return <Spin size="small" style={{ padding: '8px 16px', display: 'block' }} />
            return (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={itemsMap[record.id] ?? []}
                columns={itemColumns}
                scroll={{ x: 740 }}
              />
            )
          },
        }}
      />
    </>
  )
}

import { useEffect, useState } from 'react'
import { Form, DatePicker, Input, Button, Table, InputNumber, App, Spin, Tag } from 'antd'
import { DeleteOutlined, SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import {
  createPurchaseReturn, getPurchaseReturn, updatePurchaseReturn,
  getPurchaseOrders, getPurchaseOrder,
  type PurchaseOrder,
} from '@/api/purchase'
import { getErrorMessage } from '@/utils/error'
import styles from './Purchase.module.css'

interface LineItem {
  key: number
  productId: number
  productCode: string
  productName: string
  unit: string
  originalQty: number
  originalPieces: number
  qty: number
  pieces: number
  unitPrice: number
  amount: number
  notes: string
}

let keyCounter = 0

export default function PurchaseReturnNew() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')
  const [searching, setSearching] = useState(false)

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [lines, setLines] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  // Initial load
  useEffect(() => {
    setOrdersLoading(true)
    getPurchaseOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setOrdersLoading(false))

    if (!isEdit) return

    getPurchaseReturn(Number(id))
      .then(ret => {
        form.setFieldsValue({
          returnDate: dayjs(ret.returnDate),
          notes: ret.notes,
        })
        if (ret.originalOrderId) {
          getPurchaseOrder(ret.originalOrderId).then(setSelectedOrder).catch(() => {})
        }
        setLines(
          (ret.items ?? []).map(item => ({
            key: keyCounter++,
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            unit: item.unit,
            originalQty: item.qty,
            originalPieces: item.pieces ?? 0,
            qty: item.qty,
            pieces: item.pieces ?? 0,
            unitPrice: item.unitPrice,
            amount: item.amount,
            notes: item.notes ?? '',
          }))
        )
      })
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  // Search orders (debounce-free — fires on Enter or button click)
  const handleSearch = (kw: string) => {
    setSearching(true)
    getPurchaseOrders({ search: kw || undefined })
      .then(setOrders)
      .catch(() => {})
      .finally(() => setSearching(false))
  }

  const handleSelectOrder = (order: PurchaseOrder) => {
    getPurchaseOrder(order.id)
      .then(full => {
        setSelectedOrder(full)
        setLines(
          (full.items ?? []).map(item => ({
            key: keyCounter++,
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            unit: item.unit,
            originalQty: item.qty,
            originalPieces: item.pieces ?? 0,
            qty: item.qty,
            pieces: item.pieces ?? 0,
            unitPrice: item.unitPrice,
            amount: item.amount,
            notes: '',
          }))
        )
      })
      .catch(err => message.error(getErrorMessage(err)))
  }

  const updateLine = (key: number, changes: Partial<LineItem>) => {
    setLines(prev => prev.map(line => {
      if (line.key !== key) return line
      const updated = { ...line, ...changes }
      updated.amount = +(updated.qty * updated.unitPrice).toFixed(2)
      return updated
    }))
  }

  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0)
  const totalPieces = lines.reduce((s, l) => s + (l.pieces || 0), 0)
  const totalAmount = lines.reduce((s, l) => s + (l.amount || 0), 0)

  const handleSubmit = () => {
    if (!selectedOrder && !isEdit) { message.warning('请先选择原采购单'); return }
    const validLines = lines.filter(l => l.qty > 0)
    if (validLines.length === 0) { message.warning('请至少保留一条退货明细'); return }

    form.validateFields().then(values => {
      setSaving(true)
      const payload = {
        supplierId: selectedOrder!.supplierId,
        returnDate: values.returnDate.format('YYYY-MM-DD'),
        originalOrderId: selectedOrder?.id,
        notes: values.notes,
        items: validLines.map(({ productId, qty, pieces, unitPrice, notes }) => ({
          productId,
          qty,
          pieces: pieces || 0,
          unitPrice,
          notes: notes || undefined,
        })),
      }
      const req = isEdit ? updatePurchaseReturn(Number(id), payload) : createPurchaseReturn(payload)
      req
        .then(ret => {
          message.success(isEdit ? '更新成功' : '退货单已保存')
          navigate(isEdit ? '/purchase/returns' : `/purchase/returns/${ret.id}`)
        })
        .catch(err => message.error(getErrorMessage(err)))
        .finally(() => setSaving(false))
    })
  }

  const orderColumns: ColumnsType<PurchaseOrder> = [
    { title: '单号', dataIndex: 'orderNo', width: 160 },
    { title: '供应商', width: 150, render: (_, r) => `${r.supplierCode} ${r.supplierName}` },
    { title: '日期', dataIndex: 'orderDate', width: 100 },
    { title: '数量', dataIndex: 'totalQty', width: 70, align: 'center' },
    { title: '金额', dataIndex: 'totalAmount', width: 100, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '', width: 70, align: 'center',
      render: (_, r) => (
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

  const itemColumns = [
    {
      title: '货品', width: 200,
      render: (_: unknown, r: LineItem) => <span>{r.productCode} {r.productName}</span>,
    },
    { title: '单位', dataIndex: 'unit', width: 60, align: 'center' as const },
    {
      title: '原数量', width: 80, align: 'center' as const,
      render: (_: unknown, r: LineItem) => <span style={{ color: '#aaa' }}>{r.originalQty}</span>,
    },
    {
      title: '退货数量', width: 100,
      render: (_: unknown, r: LineItem) => (
        <InputNumber min={0} max={r.originalQty} value={r.qty} style={{ width: '100%' }}
          onChange={val => updateLine(r.key, { qty: val ?? 0 })} />
      ),
    },
    {
      title: '原件数', width: 75, align: 'center' as const,
      render: (_: unknown, r: LineItem) => <span style={{ color: '#aaa' }}>{r.originalPieces || '—'}</span>,
    },
    {
      title: '退货件数', width: 95,
      render: (_: unknown, r: LineItem) => (
        <InputNumber min={0} value={r.pieces} style={{ width: '100%' }}
          onChange={val => updateLine(r.key, { pieces: val ?? 0 })} />
      ),
    },
    {
      title: '单价', width: 100,
      render: (_: unknown, r: LineItem) => (
        <InputNumber min={0} precision={2} value={r.unitPrice} style={{ width: '100%' }}
          onChange={val => updateLine(r.key, { unitPrice: val ?? 0 })} />
      ),
    },
    {
      title: '金额', width: 90, align: 'right' as const,
      render: (_: unknown, r: LineItem) => <span>¥{r.amount.toFixed(2)}</span>,
    },
    {
      title: '备注',
      render: (_: unknown, r: LineItem) => (
        <Input value={r.notes} placeholder="可选" onChange={e => updateLine(r.key, { notes: e.target.value })} />
      ),
    },
    {
      title: '', width: 40,
      render: (_: unknown, r: LineItem) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => setLines(prev => prev.filter(l => l.key !== r.key))}
          disabled={lines.length === 1} />
      ),
    },
  ]

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/purchase/returns')}>返回</Button>
        <span className={styles.pageTitle} style={{ margin: 0 }}>{isEdit ? '编辑退货单' : '采购退货'}</span>
      </div>

      {/* Step 1: Select original order */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#555' }}>选择原采购单</div>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索单号、供应商名称/编码、货品名称/编码"
          allowClear
          value={orderSearch}
          style={{ marginBottom: 8, width: 400 }}
          onChange={e => setOrderSearch(e.target.value)}
          onPressEnter={() => handleSearch(orderSearch)}
          onClear={() => handleSearch('')}
          suffix={
            <Button size="small" type="link" onClick={() => handleSearch(orderSearch)} style={{ padding: 0 }}>
              搜索
            </Button>
          }
        />
        {ordersLoading || searching
          ? <Spin size="small" style={{ display: 'block', margin: '16px auto' }} />
          : (
            <Table
              rowKey="id"
              size="small"
              columns={orderColumns}
              dataSource={orders}
              pagination={{ pageSize: 5, size: 'small', showTotal: t => `共 ${t} 条` }}
              rowClassName={(r: PurchaseOrder) => r.id === selectedOrder?.id ? 'ant-table-row-selected' : ''}
              scroll={{ x: 650 }}
            />
          )
        }
      </div>

      {/* Selected order highlight */}
      {selectedOrder && (
        <div style={{
          background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6,
          padding: '8px 14px', marginBottom: 16, fontSize: 13,
        }}>
          已选：<strong>{selectedOrder.orderNo}</strong>
          &emsp;{selectedOrder.supplierCode} {selectedOrder.supplierName}
          &emsp;采购金额 <strong>¥{selectedOrder.totalAmount.toFixed(2)}</strong>
          &emsp;日期：{selectedOrder.orderDate}
          &emsp;<Tag color="green">已选择</Tag>
        </div>
      )}

      {/* Step 2: Return details */}
      {lines.length > 0 && (
        <>
          <Form form={form} layout="inline" className={styles.headerForm} style={{ marginBottom: 12 }}>
            <Form.Item name="returnDate" label="退货日期" initialValue={dayjs()} rules={[{ required: true }]}>
              <DatePicker />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input placeholder="可选" style={{ width: 220 }} />
            </Form.Item>
          </Form>

          <Table
            rowKey="key"
            columns={itemColumns}
            dataSource={lines}
            pagination={false}
            size="small"
            scroll={{ x: 800 }}
            footer={() => (
              <div className={styles.tableFooter}>
                <span style={{ color: '#888', fontSize: 13 }}>可删除行或将数量改为 0 来跳过该货品</span>
                <div className={styles.totals}>
                  退货数量：<strong>{totalQty}</strong>
                  &emsp;退货件数：<strong>{totalPieces}</strong>
                  &emsp;退货金额：<strong>¥{totalAmount.toFixed(2)}</strong>
                </div>
              </div>
            )}
          />

          <div className={styles.actions}>
            <Button onClick={() => navigate('/purchase/returns')}>取消</Button>
            <Button type="primary" loading={saving} onClick={handleSubmit}>
              {isEdit ? '保存修改' : '保存退货单'}
            </Button>
          </div>
        </>
      )}

      {!selectedOrder && !isEdit && lines.length === 0 && (
        <div style={{ textAlign: 'center', color: '#bbb', marginTop: 40 }}>
          请在上方选择原采购单，系统将自动加载货品明细
        </div>
      )}
    </>
  )
}

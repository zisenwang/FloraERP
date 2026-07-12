import { useEffect, useState } from 'react'
import { Form, Select, DatePicker, Input, Button, Table, InputNumber, App, Spin, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined, StopOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { createPurchaseOrder, getPurchaseOrder, updatePurchaseOrder, voidPurchaseOrder } from '@/api/purchase'
import { getSuppliers, type Supplier } from '@/api/suppliers'
import { getProducts, type Product } from '@/api/products'
import { getErrorMessage } from '@/utils/error'
import styles from './Purchase.module.css'

interface LineItem {
  key: number
  productId?: number
  productCode: string
  productName: string
  unitsPerPiece?: number
  qty: number
  pieces: number
  unitPrice: number
  discount: number
  amount: number
  notes: string
}

let keyCounter = 0
const newLine = (): LineItem => ({
  key: keyCounter++,
  productCode: '',
  productName: '',
  qty: 0,
  pieces: 0,
  unitPrice: 0,
  discount: 100,
  amount: 0,
  notes: '',
})

export default function PurchaseOrderNew() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id

  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [lines, setLines] = useState<LineItem[]>([newLine()])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [orderStatus, setOrderStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit) {
      getSuppliers().then(setSuppliers).catch(() => {})
      return
    }

    Promise.all([getPurchaseOrder(Number(id)), getSuppliers()])
      .then(async ([order, supplierList]) => {
        setSuppliers(supplierList)
        setOrderStatus(order.status)
        form.setFieldsValue({
          supplierId: order.supplierId,
          orderDate: dayjs(order.orderDate),
          notes: order.notes,
        })
        const prods = await getProducts({ supplierId: order.supplierId })
        setProducts(prods)
        const loaded: LineItem[] = (order.items ?? []).map(item => ({
          key: keyCounter++,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          unitsPerPiece: prods.find(p => p.id === item.productId)?.unitsPerPiece ?? undefined,
          qty: item.qty,
          pieces: item.pieces ?? 0,
          unitPrice: item.unitPrice,
          discount: item.discount,
          amount: item.amount,
          notes: item.notes ?? '',
        }))
        setLines(loaded.length ? loaded : [newLine()])
      })
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  const handleSupplierChange = (supplierId: number) => {
    setLines([newLine()])
    getProducts({ supplierId }).then(setProducts).catch(() => {})
  }

  const updateLine = (key: number, changes: Partial<LineItem>) => {
    setLines(prev => prev.map(line => {
      if (line.key !== key) return line
      const updated = { ...line, ...changes }
      updated.amount = +(updated.qty * updated.unitPrice * (updated.discount / 100)).toFixed(2)
      // Auto-recalc pieces when qty changes and user hasn't manually overridden
      if ('qty' in changes && updated.unitsPerPiece && !('pieces' in changes)) {
        updated.pieces = Math.ceil(updated.qty / updated.unitsPerPiece)
      }
      return updated
    }))
  }

  const handleProductSelect = (key: number, productId: number) => {
    const p = products.find(p => p.id === productId)
    if (!p) return
    const currentLine = lines.find(l => l.key === key)
    const qty = currentLine?.qty ?? 0
    const pieces = p.unitsPerPiece && qty > 0 ? Math.ceil(qty / p.unitsPerPiece) : 0
    updateLine(key, {
      productId,
      productCode: p.code,
      productName: p.name,
      unitPrice: p.costPrice ?? p.price,
      unitsPerPiece: p.unitsPerPiece ?? undefined,
      pieces,
    })
  }

  const removeLine = (key: number) => {
    setLines(prev => prev.filter(l => l.key !== key))
  }

  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0)
  const totalPieces = lines.reduce((s, l) => s + (l.pieces || 0), 0)
  const totalAmount = lines.reduce((s, l) => s + (l.amount || 0), 0)

  const handleVoid = async () => {
    setVoiding(true)
    try {
      await voidPurchaseOrder(Number(id))
      message.success('已作废')
      navigate('/purchase/orders')
    } catch (err) {
      message.error(getErrorMessage(err))
    } finally {
      setVoiding(false)
    }
  }

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const validLines = lines.filter(l => l.productId && l.qty > 0)
      if (validLines.length === 0) {
        message.warning('请至少添加一条货品明细')
        return
      }
      setSaving(true)
      const payload = {
        supplierId: values.supplierId,
        orderDate: values.orderDate.format('YYYY-MM-DD'),
        notes: values.notes,
        items: validLines.map(({ productId, qty, pieces, unitPrice, discount, notes }) => ({
          productId: productId!,
          qty,
          pieces: pieces || 0,
          unitPrice,
          discount,
          notes: notes || undefined,
        })),
      }
      const req = isEdit
        ? updatePurchaseOrder(Number(id), payload)
        : createPurchaseOrder(payload)

      req
        .then(order => {
          message.success(isEdit ? '更新成功' : '采购入库成功')
          navigate(isEdit ? '/purchase/orders' : `/purchase/orders/${order.id}`)
        })
        .catch(err => message.error(getErrorMessage(err)))
        .finally(() => setSaving(false))
    })
  }

  const columns = [
    {
      title: '货品', width: 220,
      render: (_: unknown, record: LineItem) => (
        <Select
          showSearch={{ filterOption: (input, option) =>
            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }}
          placeholder="选择货品"
          style={{ width: '100%' }}
          value={record.productId}
          options={products.map(p => ({ value: p.id, label: `${p.code} ${p.name}` }))}
          onChange={val => handleProductSelect(record.key, val)}
        />
      ),
    },
    {
      title: '编码', dataIndex: 'productCode', width: 100,
      render: (_: unknown, record: LineItem) => (
        <span style={{ fontSize: 13, color: '#888' }}>{record.productCode || '—'}</span>
      ),
    },
    {
      title: '数量', width: 90,
      render: (_: unknown, record: LineItem) => (
        <InputNumber min={0} value={record.qty} style={{ width: '100%' }}
          onChange={val => updateLine(record.key, { qty: val ?? 0 })} />
      ),
    },
    {
      title: '件数', width: 80,
      render: (_: unknown, record: LineItem) => (
        <InputNumber min={0} value={record.pieces} style={{ width: '100%' }}
          onChange={val => updateLine(record.key, { pieces: val ?? 0 })} />
      ),
    },
    {
      title: '单价', width: 100,
      render: (_: unknown, record: LineItem) => (
        <InputNumber min={0} precision={2} value={record.unitPrice} style={{ width: '100%' }}
          onChange={val => updateLine(record.key, { unitPrice: val ?? 0 })} />
      ),
    },
    {
      title: '折扣%', width: 80,
      render: (_: unknown, record: LineItem) => (
        <InputNumber min={0} max={100} value={record.discount} style={{ width: '100%' }}
          onChange={val => updateLine(record.key, { discount: val ?? 100 })} />
      ),
    },
    {
      title: '金额', width: 100, align: 'right' as const,
      render: (_: unknown, record: LineItem) => <span>¥{record.amount.toFixed(2)}</span>,
    },
    {
      title: '备注',
      render: (_: unknown, record: LineItem) => (
        <Input
          value={record.notes}
          placeholder="可选"
          onChange={e => updateLine(record.key, { notes: e.target.value })}
        />
      ),
    },
    {
      title: '', width: 40,
      render: (_: unknown, record: LineItem) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => removeLine(record.key)} disabled={lines.length === 1} />
      ),
    },
  ]

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  return (
    <>
      <div className={styles.pageTitle}>{isEdit ? '编辑采购单' : '采购入库'}</div>

      <Form form={form} layout="inline" className={styles.headerForm}>
        <Form.Item name="supplierId" label="供应商" rules={[{ required: true, message: '请选择供应商' }]}>
          <Select
            showSearch={{ filterOption: (input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }}
            placeholder="选择供应商"
            style={{ width: 200 }}
            options={suppliers.map(s => ({ value: s.id, label: `${s.code} ${s.name}` }))}
            onChange={handleSupplierChange}
          />
        </Form.Item>
        <Form.Item name="orderDate" label="日期" initialValue={isEdit ? undefined : dayjs()} rules={[{ required: true }]}>
          <DatePicker />
        </Form.Item>
        <Form.Item name="notes" label="备注">
          <Input placeholder="可选" style={{ width: 200 }} />
        </Form.Item>
      </Form>

      <Table
        rowKey="key"
        columns={columns}
        dataSource={lines}
        pagination={false}
        size="small"
        style={{ marginTop: 16 }}
        footer={() => (
          <div className={styles.tableFooter}>
            <Button icon={<PlusOutlined />} onClick={() => setLines(p => [...p, newLine()])}>
              添加行
            </Button>
            <div className={styles.totals}>
              合计数量：<strong>{totalQty}</strong>
              &emsp;合计件数：<strong>{totalPieces}</strong>
              &emsp;合计金额：<strong>¥{totalAmount.toFixed(2)}</strong>
            </div>
          </div>
        )}
      />

      <div className={styles.actions}>
        <Button onClick={() => navigate('/purchase/orders')}>取消</Button>
        {isEdit && orderStatus !== '作废' && (
          <Popconfirm
            title="作废此单据？"
            description="作废后数量归零，单据保留，此操作不可撤销"
            okText="确认作废"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={handleVoid}
          >
            <Button danger icon={<StopOutlined />} loading={voiding}>作废此单</Button>
          </Popconfirm>
        )}
        <Button type="primary" loading={saving} onClick={handleSubmit}>
          {isEdit ? '保存修改' : '保存入库'}
        </Button>
      </div>
    </>
  )
}

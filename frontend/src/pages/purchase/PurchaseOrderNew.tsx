import { useEffect, useState } from 'react'
import { Form, Select, DatePicker, Input, Button, Table, InputNumber, App, Spin } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { createPurchaseOrder, getPurchaseOrder, updatePurchaseOrder } from '@/api/purchase'
import { getSuppliers, type Supplier } from '@/api/suppliers'
import { getProducts, type Product } from '@/api/products'
import { getErrorMessage } from '@/utils/error'
import styles from './Purchase.module.css'

interface LineItem {
  key: number
  productId?: number
  productCode: string
  productName: string
  qty: number
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

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(() => {})

    if (!isEdit) return

    getPurchaseOrder(Number(id))
      .then(order => {
        form.setFieldsValue({
          supplierId: order.supplierId,
          orderDate: dayjs(order.orderDate),
          notes: order.notes,
        })
        getProducts({ supplierId: order.supplierId }).then(setProducts).catch(() => {})
        const loaded: LineItem[] = (order.items ?? []).map(item => ({
          key: keyCounter++,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          qty: item.qty,
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
      return updated
    }))
  }

  const handleProductSelect = (key: number, productId: number) => {
    const p = products.find(p => p.id === productId)
    if (!p) return
    updateLine(key, { productId, productCode: p.code, productName: p.name, unitPrice: p.costPrice ?? p.price })
  }

  const removeLine = (key: number) => {
    setLines(prev => prev.filter(l => l.key !== key))
  }

  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0)
  const totalAmount = lines.reduce((s, l) => s + (l.amount || 0), 0)

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
        items: validLines.map(({ productId, qty, unitPrice, discount, notes }) => ({
          productId: productId!,
          qty,
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
              &emsp;合计金额：<strong>¥{totalAmount.toFixed(2)}</strong>
            </div>
          </div>
        )}
      />

      <div className={styles.actions}>
        <Button onClick={() => navigate('/purchase/orders')}>取消</Button>
        <Button type="primary" loading={saving} onClick={handleSubmit}>
          {isEdit ? '保存修改' : '保存入库'}
        </Button>
      </div>
    </>
  )
}

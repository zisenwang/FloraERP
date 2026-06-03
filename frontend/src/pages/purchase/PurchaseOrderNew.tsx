import { useEffect, useState } from 'react'
import { Form, Select, DatePicker, Input, Button, Table, InputNumber, App } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { createPurchaseOrder } from '@/api/purchase'
import { getSuppliers, type Supplier } from '@/api/suppliers'
import { getProducts, type Product } from '@/api/products'
import { getErrorMessage } from '@/utils/error'
import styles from './Purchase.module.css'

interface LineItem {
  key: number
  product_id?: number
  product_code: string
  product_name: string
  qty: number
  unit_price: number
  discount: number
  amount: number
}

let keyCounter = 0
const newLine = (): LineItem => ({
  key: keyCounter++,
  product_code: '',
  product_name: '',
  qty: 0,
  unit_price: 0,
  discount: 100,
  amount: 0,
})

export default function PurchaseOrderNew() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [lines, setLines] = useState<LineItem[]>([newLine()])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(() => {})
  }, [])

  const handleSupplierChange = (supplierId: number) => {
    setLines([newLine()])
    getProducts({ supplier_id: supplierId }).then(setProducts).catch(() => {})
  }

  const updateLine = (key: number, changes: Partial<LineItem>) => {
    setLines(prev => prev.map(line => {
      if (line.key !== key) return line
      const updated = { ...line, ...changes }
      updated.amount = +(updated.qty * updated.unit_price * (updated.discount / 100)).toFixed(2)
      return updated
    }))
  }

  const handleProductSelect = (key: number, productId: number) => {
    const p = products.find(p => p.id === productId)
    if (!p) return
    updateLine(key, {
      product_id: productId,
      product_code: p.code,
      product_name: p.name,
      unit_price: p.price,
    })
  }

  const removeLine = (key: number) => {
    setLines(prev => prev.filter(l => l.key !== key))
  }

  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0)
  const totalAmount = lines.reduce((s, l) => s + (l.amount || 0), 0)

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const validLines = lines.filter(l => l.product_code && l.qty > 0)
      if (validLines.length === 0) {
        message.warning('请至少添加一条货品明细')
        return
      }

      setSaving(true)
      createPurchaseOrder({
        supplier_id: values.supplier_id,
        order_date: values.order_date.format('YYYY-MM-DD'),
        notes: values.notes,
        items: validLines.map(({ product_code, product_name, qty, unit_price, discount }) => ({
          product_code, product_name, qty, unit_price, discount,
        })),
      })
        .then(() => {
          message.success('采购入库成功')
          navigate('/purchase/orders')
        })
        .catch(err => message.error(getErrorMessage(err)))
        .finally(() => setSaving(false))
    })
  }

  const columns = [
    {
      title: '货品',
      width: 220,
      render: (_: unknown, record: LineItem) => (
        <Select
          placeholder="选择货品"
          style={{ width: '100%' }}
          value={record.product_id}
          options={products.map(p => ({ value: p.id, label: `${p.code} ${p.name}` }))}
          onChange={val => handleProductSelect(record.key, val)}
        />
      ),
    },
    {
      title: '编码', dataIndex: 'product_code', width: 100,
      render: (_: unknown, record: LineItem) => (
        <span style={{ fontSize: 13, color: '#888' }}>{record.product_code || '—'}</span>
      ),
    },
    {
      title: '数量', width: 90,
      render: (_: unknown, record: LineItem) => (
        <InputNumber
          min={0} value={record.qty} style={{ width: '100%' }}
          onChange={val => updateLine(record.key, { qty: val ?? 0 })}
        />
      ),
    },
    {
      title: '单价', width: 100,
      render: (_: unknown, record: LineItem) => (
        <InputNumber
          min={0} precision={2} value={record.unit_price} style={{ width: '100%' }}
          onChange={val => updateLine(record.key, { unit_price: val ?? 0 })}
        />
      ),
    },
    {
      title: '折扣%', width: 80,
      render: (_: unknown, record: LineItem) => (
        <InputNumber
          min={0} max={100} value={record.discount} style={{ width: '100%' }}
          onChange={val => updateLine(record.key, { discount: val ?? 100 })}
        />
      ),
    },
    {
      title: '金额', width: 100, align: 'right' as const,
      render: (_: unknown, record: LineItem) => (
        <span>¥{record.amount.toFixed(2)}</span>
      ),
    },
    {
      title: '', width: 40,
      render: (_: unknown, record: LineItem) => (
        <Button
          type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => removeLine(record.key)}
          disabled={lines.length === 1}
        />
      ),
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>采购入库</div>

      <Form form={form} layout="inline" className={styles.headerForm}>
        <Form.Item name="supplier_id" label="供应商" rules={[{ required: true, message: '请选择供应商' }]}>
          <Select
            placeholder="选择供应商"
            style={{ width: 200 }}
            options={suppliers.map(s => ({ value: s.id, label: `${s.code} ${s.name}` }))}
            onChange={handleSupplierChange}
          />
        </Form.Item>
        <Form.Item name="order_date" label="日期" initialValue={dayjs()} rules={[{ required: true }]}>
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
        <Button type="primary" loading={saving} onClick={handleSubmit}>保存入库</Button>
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import { Form, Select, DatePicker, Input, Button, Table, InputNumber, App, Spin } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { createSalesOrder, getSalesOrder, updateSalesOrder } from '@/api/sales'
import { getCustomers, type Customer } from '@/api/customers'
import { getSuppliers, type Supplier } from '@/api/suppliers'
import { getProducts, type Product } from '@/api/products'
import { getErrorMessage } from '@/utils/error'
import styles from './Sales.module.css'

interface LineItem {
  key: number
  supplierId?: number
  productId?: number
  productCode: string
  productName: string
  unitsPerPiece: number | null
  qty: number
  unitPrice: number
  discount: number
  amount: number
  pieces: number
  notes: string
  costPrice: number | null
}

let keyCounter = 0
const newLine = (): LineItem => ({
  key: keyCounter++,
  productCode: '',
  productName: '',
  unitsPerPiece: null,
  qty: 0,
  unitPrice: 0,
  discount: 100,
  amount: 0,
  pieces: 0,
  notes: '',
  costPrice: null,
})

function calcPieces(qty: number, unitsPerPiece: number | null): number {
  if (!unitsPerPiece || unitsPerPiece <= 0) return 0
  return Math.ceil(qty / unitsPerPiece)
}

export default function SalesOrderNew() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id

  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [lines, setLines] = useState<LineItem[]>([newLine()])
  const [expandedKeys, setExpandedKeys] = useState<number[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCustomers().then(setCustomers).catch(() => {})
    getSuppliers().then(setSuppliers).catch(() => {})

    if (!isEdit) {
      getProducts().then(setProducts).catch(() => {})
      return
    }

    Promise.all([getProducts(), getSalesOrder(Number(id))])
      .then(([allProducts, order]) => {
        setProducts(allProducts)
        form.setFieldsValue({
          customerId: order.customerId,
          orderDate: dayjs(order.orderDate),
          notes: order.notes,
        })
        const loaded: LineItem[] = (order.items ?? []).map(item => ({
          key: keyCounter++,
          supplierId: item.supplierId,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          unitsPerPiece: null,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discount: item.discount,
          amount: item.amount,
          pieces: item.pieces,
          notes: item.notes ?? '',
          costPrice: allProducts.find(p => p.id === item.productId)?.costPrice ?? null,
        }))
        const finalLines = loaded.length ? loaded : [newLine()]
        setLines(finalLines)
        setExpandedKeys(finalLines.filter(l => !!l.productId).map(l => l.key))
      })
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  // Products filtered per line by that line's supplierId
  const productsForLine = (supplierId?: number) =>
    supplierId ? products.filter(p => p.supplierId === supplierId) : []

  const handleSupplierChange = (key: number, supplierId: number) => {
    setLines(prev => prev.map(line =>
      line.key !== key ? line : {
        ...line,
        supplierId,
        productId: undefined,
        productCode: '',
        productName: '',
        unitsPerPiece: null,
        unitPrice: 0,
        amount: 0,
        pieces: 0,
        costPrice: null,
      }
    ))
    setExpandedKeys(prev => prev.filter(k => k !== key))
  }

  const handleProductSelect = (key: number, productId: number) => {
    const p = products.find(p => p.id === productId)
    if (!p) return
    setLines(prev => prev.map(line => {
      if (line.key !== key) return line
      const qty = line.qty
      const unitsPerPiece = p.unitsPerPiece ?? null
      return {
        ...line,
        productId,
        productCode: p.code,
        productName: p.name,
        unitsPerPiece,
        unitPrice: p.price,
        amount: +(qty * p.price * (line.discount / 100)).toFixed(2),
        pieces: calcPieces(qty, unitsPerPiece),
        costPrice: p.costPrice ?? null,
      }
    }))
    setExpandedKeys(prev => prev.includes(key) ? prev : [...prev, key])
  }

  const updateLine = (key: number, changes: Partial<LineItem>) => {
    setLines(prev => prev.map(line => {
      if (line.key !== key) return line
      const updated = { ...line, ...changes }
      updated.amount = +(updated.qty * updated.unitPrice * (updated.discount / 100)).toFixed(2)
      if ('qty' in changes && !('pieces' in changes)) {
        updated.pieces = calcPieces(updated.qty, updated.unitsPerPiece)
      }
      return updated
    }))
  }

  const removeLine = (key: number) => {
    setLines(prev => prev.filter(l => l.key !== key))
    setExpandedKeys(prev => prev.filter(k => k !== key))
  }

  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0)
  const totalPieces = lines.reduce((s, l) => s + (l.pieces || 0), 0)
  const totalAmount = lines.reduce((s, l) => s + (l.amount || 0), 0)
  const totalProfit = +lines
    .filter(l => l.costPrice != null && l.qty > 0)
    .reduce((s, l) => s + (l.unitPrice * (l.discount / 100) - l.costPrice!) * l.qty, 0)
    .toFixed(2)

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const validLines = lines.filter(l => l.productId && l.supplierId && l.qty > 0)
      if (validLines.length === 0) {
        message.warning('请至少添加一条货品明细')
        return
      }
      setSaving(true)
      const payload = {
        customerId: values.customerId,
        orderDate: values.orderDate.format('YYYY-MM-DD'),
        notes: values.notes,
        items: validLines.map(({ productId, supplierId, qty, unitPrice, discount, pieces, notes, costPrice }) => ({
          productId: productId!,
          supplierId: supplierId!,
          qty,
          unitPrice,
          discount,
          pieces: pieces ?? 0,
          notes: notes || undefined,
          costPrice: costPrice ?? null,
        })),
      }
      const req = isEdit
        ? updateSalesOrder(Number(id), payload)
        : createSalesOrder(payload)

      req
        .then(order => {
          message.success(isEdit ? '更新成功' : '销售开单成功')
          navigate(`/sales/orders/${isEdit ? id : order.id}`)
        })
        .catch(err => message.error(getErrorMessage(err)))
        .finally(() => setSaving(false))
    })
  }

  const columns = [
    {
      title: '供应商', width: 160,
      render: (_: unknown, record: LineItem) => (
        <Select
          placeholder="选择供应商"
          style={{ width: '100%' }}
          value={record.supplierId}
          options={suppliers.map(s => ({ value: s.id, label: `${s.code} ${s.name}` }))}
          onChange={val => handleSupplierChange(record.key, val)}
        />
      ),
    },
    {
      title: '货品', width: 200,
      render: (_: unknown, record: LineItem) => (
        <Select
          showSearch
          placeholder={record.supplierId ? '选择货品' : '请先选供应商'}
          style={{ width: '100%' }}
          value={record.productId}
          disabled={!record.supplierId}
          filterOption={(input, option) =>
            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={productsForLine(record.supplierId).map(p => ({
            value: p.id,
            label: `${p.code} ${p.name}`,
          }))}
          onChange={val => handleProductSelect(record.key, val)}
        />
      ),
    },
    {
      title: '编码', width: 100,
      render: (_: unknown, record: LineItem) => (
        <span style={{ fontSize: 13, color: '#888' }}>{record.productCode || '—'}</span>
      ),
    },
    {
      title: '数量', width: 95,
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
          min={0} precision={2} value={record.unitPrice} style={{ width: '100%' }}
          onChange={val => updateLine(record.key, { unitPrice: val ?? 0 })}
        />
      ),
    },
    {
      title: '折扣%', width: 85,
      render: (_: unknown, record: LineItem) => (
        <InputNumber
          min={0} max={100} value={record.discount} style={{ width: '100%' }}
          onChange={val => updateLine(record.key, { discount: val ?? 100 })}
        />
      ),
    },
    {
      title: '金额', width: 100,
      render: (_: unknown, record: LineItem) => <span>¥{record.amount.toFixed(2)}</span>,
    },
    {
      title: '件数', width: 90,
      render: (_: unknown, record: LineItem) => (
        <InputNumber
          min={0} precision={0} value={record.pieces} style={{ width: '100%' }}
          onChange={val => updateLine(record.key, { pieces: val ?? 0 })}
        />
      ),
    },
    {
      title: '备注', width: 200,
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
      <div className={styles.pageTitle}>{isEdit ? '编辑销售单' : '销售开单'}</div>

      <Form form={form} layout="inline" className={styles.headerForm}>
        <Form.Item name="customerId" label="客户" rules={[{ required: true, message: '请选择客户' }]}>
          <Select
            showSearch
            placeholder="选择客户"
            style={{ width: 200 }}
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={customers.map(c => ({ value: c.id, label: `${c.code} ${c.name}` }))}
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
        scroll={{ x: 960 }}
        expandable={{
          showExpandColumn: false,
          expandedRowKeys: expandedKeys,
          expandedRowRender: (record: LineItem) => {
            if (record.costPrice == null) return null
            const sellPrice = record.unitPrice * (record.discount / 100)
            const profitPerUnit = sellPrice - record.costPrice
            const totalProfit = +(profitPerUnit * record.qty).toFixed(2)
            const margin = sellPrice > 0 ? ((profitPerUnit / sellPrice) * 100).toFixed(1) : '0.0'
            const isProfit = profitPerUnit >= 0
            return (
              <div style={{ fontSize: 12, color: isProfit ? '#389e0d' : '#cf1322', paddingLeft: 8 }}>
                进价 ¥{record.costPrice.toFixed(2)} &nbsp;｜&nbsp;
                单位毛利 {isProfit ? '+' : ''}¥{profitPerUnit.toFixed(2)} &nbsp;｜&nbsp;
                毛利率 {margin}% &nbsp;｜&nbsp;
                本行毛利 {isProfit ? '+' : ''}¥{totalProfit.toFixed(2)}
              </div>
            )
          },
        }}
        footer={() => (
          <div className={styles.tableFooter}>
            <Button icon={<PlusOutlined />} onClick={() => setLines(p => [...p, newLine()])}>
              添加行
            </Button>
            <div className={styles.totals}>
              合计数量：<strong>{totalQty}</strong>
              &emsp;合计件数：<strong>{totalPieces}</strong>
              &emsp;合计金额：<strong>¥{totalAmount.toFixed(2)}</strong>
              &emsp;<span style={{ color: totalProfit >= 0 ? '#389e0d' : '#cf1322' }}>
                毛利：<strong>¥{totalProfit.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        )}
      />

      <div className={styles.actions}>
        <Button onClick={() => navigate('/sales/orders')}>取消</Button>
        <Button type="primary" loading={saving} onClick={handleSubmit}>
          {isEdit ? '保存修改' : '保存开单'}
        </Button>
      </div>
    </>
  )
}

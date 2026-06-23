import { useEffect, useState } from 'react'
import { Form, Select, DatePicker, Input, Button, Table, InputNumber, App, Spin } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  createPurchaseReturn, getPurchaseReturn, updatePurchaseReturn,
} from '@/api/purchase'
import { getSuppliers, type Supplier } from '@/api/suppliers'
import { getProducts, type Product } from '@/api/products'
import { getErrorMessage } from '@/utils/error'
import styles from './Purchase.module.css'

interface LineItem {
  key: number
  productId?: number
  productCode: string
  productName: string
  unitsPerPiece: number | null
  unit: string
  qty: number
  pieces: number
  unitPrice: number
  amount: number
  notes: string
}

let keyCounter = 0
const newLine = (): LineItem => ({
  key: keyCounter++,
  productCode: '',
  productName: '',
  unitsPerPiece: null,
  unit: '',
  qty: 0,
  pieces: 0,
  unitPrice: 0,
  amount: 0,
  notes: '',
})

function calcPieces(qty: number, unitsPerPiece: number | null): number {
  if (!unitsPerPiece || unitsPerPiece <= 0) return 0
  return Math.ceil(qty / unitsPerPiece)
}

export default function PurchaseReturnNew() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [lines, setLines] = useState<LineItem[]>([newLine()])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(() => {})

    if (!isEdit) {
      getProducts().then(setAllProducts).catch(() => {})
      return
    }

    Promise.all([getProducts(), getPurchaseReturn(Number(id))])
      .then(([prods, ret]) => {
        setAllProducts(prods)
        form.setFieldsValue({
          supplierId: ret.supplierId,
          returnDate: dayjs(ret.returnDate),
          notes: ret.notes,
        })
        const loaded: LineItem[] = (ret.items ?? []).map(item => {
          const p = prods.find(p => p.id === item.productId)
          return {
            key: keyCounter++,
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            unitsPerPiece: p?.unitsPerPiece ?? null,
            unit: item.unit,
            qty: item.qty,
            pieces: item.pieces ?? 0,
            unitPrice: item.unitPrice,
            amount: item.amount,
            notes: item.notes ?? '',
          }
        })
        setLines(loaded.length ? loaded : [newLine()])
      })
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  const supplierId: number | undefined = Form.useWatch('supplierId', form)
  const productsForSupplier = supplierId
    ? allProducts.filter(p => p.supplierId === supplierId)
    : []

  const handleProductSelect = (key: number, productId: number) => {
    const p = allProducts.find(p => p.id === productId)
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
        unit: p.unit ?? '',
        unitsPerPiece,
        unitPrice: p.price,
        amount: +(qty * p.price).toFixed(2),
        pieces: calcPieces(qty, unitsPerPiece),
      }
    }))
  }

  const updateLine = (key: number, changes: Partial<LineItem>) => {
    setLines(prev => prev.map(line => {
      if (line.key !== key) return line
      const updated = { ...line, ...changes }
      updated.amount = +(updated.qty * updated.unitPrice).toFixed(2)
      if ('qty' in changes && !('pieces' in changes)) {
        updated.pieces = calcPieces(updated.qty, updated.unitsPerPiece)
      }
      return updated
    }))
  }

  // Reset lines when supplier changes
  const handleSupplierChange = () => {
    setLines([newLine()])
  }

  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0)
  const totalPieces = lines.reduce((s, l) => s + (l.pieces || 0), 0)
  const totalAmount = lines.reduce((s, l) => s + (l.amount || 0), 0)

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const validLines = lines.filter(l => l.productId && l.qty > 0)
      if (validLines.length === 0) {
        message.warning('请至少添加一条退货明细')
        return
      }
      setSaving(true)
      const payload = {
        supplierId: values.supplierId,
        returnDate: values.returnDate.format('YYYY-MM-DD'),
        notes: values.notes,
        items: validLines.map(({ productId, qty, pieces, unitPrice, notes }) => ({
          productId: productId!,
          qty,
          pieces: pieces ?? 0,
          unitPrice,
          notes: notes || undefined,
        })),
      }
      const req = isEdit ? updatePurchaseReturn(Number(id), payload) : createPurchaseReturn(payload)
      req
        .then(ret => {
          message.success(isEdit ? '更新成功' : '退货单已保存')
          navigate(isEdit ? '/purchase/orders' : `/purchase/returns/${ret.id}`)
        })
        .catch(err => message.error(getErrorMessage(err)))
        .finally(() => setSaving(false))
    })
  }

  const columns = [
    {
      title: '货品', width: 200,
      render: (_: unknown, r: LineItem) => (
        <Select
          showSearch={{ filterOption: (input, option) =>
            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase()) }}
          placeholder="选择货品"
          style={{ width: '100%' }}
          value={r.productId}
          disabled={!supplierId}
          onChange={(v: number) => handleProductSelect(r.key, v)}
          options={productsForSupplier.map(p => ({
            value: p.id,
            label: `${p.code} ${p.name}`,
          }))}
        />
      ),
    },
    {
      title: '编码', width: 100,
      render: (_: unknown, record: LineItem) => (
          <span style={{ fontSize: 13, color: '#888' }}>{record.productCode || '—'}</span>
      ),
    },{ title: '单位', dataIndex: 'unit', width: 55, align: 'center' as const },
    {
      title: '数量', width: 80,
      render: (_: unknown, r: LineItem) => (
        <InputNumber min={0} value={r.qty} style={{ width: '100%' }}
          onChange={val => updateLine(r.key, { qty: val ?? 0 })} />
      ),
    },
    {
      title: '单价', width: 95,
      render: (_: unknown, r: LineItem) => (
        <InputNumber min={0} precision={2} value={r.unitPrice} style={{ width: '100%' }}
          onChange={val => updateLine(r.key, { unitPrice: val ?? 0 })} />
      ),
    },
    {
      title: '金额', width: 90, align: 'center' as const,
      render: (_: unknown, r: LineItem) => `¥${r.amount.toFixed(2)}`,
    },
    {
      title: '件数', width: 75,
      render: (_: unknown, r: LineItem) => (
          <InputNumber min={0} value={r.pieces} style={{ width: '100%' }}
                       onChange={val => updateLine(r.key, { pieces: val ?? 0 })} />
      ),
    },
    {
      title: '备注', width: 200,
      render: (_: unknown, r: LineItem) => (
        <Input value={r.notes} placeholder="可选"
          onChange={e => updateLine(r.key, { notes: e.target.value })} />
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
        <span className={styles.pageTitle} style={{ margin: 0 }}>{isEdit ? '编辑退货单' : '采购退货'}</span>
      </div>

      <Form form={form} layout="inline" className={styles.headerForm} style={{ marginBottom: 16 }}>
        <Form.Item name="supplierId" label="供应商" rules={[{ required: true, message: '请选择供应商' }]}>
          <Select
            showSearch={{ filterOption: (input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase()) }}
            placeholder="选择供应商"
            style={{ width: 200 }}
            options={suppliers.map(s => ({
              value: s.id,
              label: `${s.code} ${s.name}`,
            }))}
            onChange={handleSupplierChange}
          />
        </Form.Item>
        <Form.Item name="returnDate" label="退货日期" initialValue={dayjs()} rules={[{ required: true }]}>
          <DatePicker />
        </Form.Item>
        <Form.Item name="notes" label="备注">
          <Input placeholder="可选" style={{ width: 220 }} />
        </Form.Item>
      </Form>

      <Table
        rowKey="key"
        columns={columns}
        dataSource={lines}
        pagination={false}
        size="small"
        scroll={{ x: 680 }}
        footer={() => (
          <div className={styles.tableFooter}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => setLines(prev => [...prev, newLine()])}
            >
              添加行
            </Button>
            <div className={styles.totals}>
              退货数量：<strong>{totalQty}</strong>
              &emsp;退货件数：<strong>{totalPieces}</strong>
              &emsp;退货金额：<strong>¥{totalAmount.toFixed(2)}</strong>
            </div>
          </div>
        )}
      />

      <div className={styles.actions}>
        <Button onClick={() => navigate('/purchase/orders')}>取消</Button>
        <Button type="primary" loading={saving} onClick={handleSubmit}>
          {isEdit ? '保存修改' : '保存退货单'}
        </Button>
      </div>
    </>
  )
}

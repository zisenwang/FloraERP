import { useEffect, useState } from 'react'
import { Form, Select, InputNumber, Input, Button, App } from 'antd'
import { useNavigate } from 'react-router-dom'
import { createLossRecord } from '@/api/loss'
import { getProducts, type Product } from '@/api/products'
import { getErrorMessage } from '@/utils/error'
import styles from './Loss.module.css'

export default function LossRecordNew() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {})
  }, [])

  const handleProductSelect = (code: string) => {
    const p = products.find(p => p.code === code) ?? null
    setSelectedProduct(p)
    form.setFieldsValue({ unit_price: p?.price ?? 0, qty: 1 })
    recalcAmount()
  }

  const recalcAmount = () => {
    const qty = form.getFieldValue('qty') ?? 0
    const price = form.getFieldValue('unit_price') ?? 0
    form.setFieldValue('total_amount', +(qty * price).toFixed(2))
  }

  const handleSubmit = () => {
    form.validateFields().then(values => {
      setSaving(true)
      createLossRecord({
        product_code: values.product_code,
        product_name: selectedProduct?.name ?? '',
        qty: values.qty,
        unit_price: values.unit_price,
        total_amount: values.total_amount,
        reason: values.reason ?? '',
      })
        .then(() => {
          message.success('报损记录已提交')
          navigate('/loss')
        })
        .catch(err => message.error(getErrorMessage(err)))
        .finally(() => setSaving(false))
    })
  }

  return (
    <>
      <div className={styles.pageTitle}>新增报损</div>

      <div className={styles.card}>
        <Form form={form} layout="vertical">
          <Form.Item name="product_code" label="货品" rules={[{ required: true, message: '请选择货品' }]}>
            <Select
              showSearch
              placeholder="选择货品"
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={products.map(p => ({
                value: p.code,
                label: `${p.code} ${p.name}（库存 ${p.stock}）`,
              }))}
              onChange={handleProductSelect}
            />
          </Form.Item>

          <Form.Item style={{ display: 'flex', gap: 0 }}>
            <Form.Item name="qty" label="报损数量" rules={[{ required: true }]} style={{ display: 'inline-block', width: '48%', marginRight: '4%' }}>
              <InputNumber min={1} style={{ width: '100%' }} onChange={recalcAmount} />
            </Form.Item>
            <Form.Item name="unit_price" label="单价" rules={[{ required: true }]} style={{ display: 'inline-block', width: '48%' }}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} onChange={recalcAmount} />
            </Form.Item>
          </Form.Item>

          <Form.Item name="total_amount" label="报损金额">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} readOnly />
          </Form.Item>

          <Form.Item name="reason" label="报损原因" rules={[{ required: true, message: '请填写原因' }]}>
            <Input.TextArea rows={3} placeholder="如：运输途中损坏、仓储过久枯萎等" />
          </Form.Item>
        </Form>

        <div className={styles.actions}>
          <Button onClick={() => navigate('/loss')}>取消</Button>
          <Button type="primary" loading={saving} onClick={handleSubmit}>提交报损</Button>
        </div>
      </div>
    </>
  )
}

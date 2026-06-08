import { useEffect, useState } from 'react'
import { Form, Select, InputNumber, Input, Button, App, DatePicker } from 'antd'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
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

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {})
  }, [])

  const handleSubmit = () => {
    form.validateFields().then(values => {
      setSaving(true)
      createLossRecord({
        productId: values.productId,
        qty: values.qty,
        reason: values.reason ?? '',
        date: values.date.format('YYYY-MM-DD'),
        notes: values.notes ?? '',
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
          <Form.Item name="productId" label="货品" rules={[{ required: true, message: '请选择货品' }]}>
            <Select
              showSearch
              placeholder="选择货品"
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={products.map(p => ({
                value: p.id,
                label: `${p.code} ${p.name}（库存 ${p.stock}）`,
              }))}
            />
          </Form.Item>

          <Form.Item name="date" label="报损日期" initialValue={dayjs()} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="qty" label="报损数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="reason" label="报损原因" rules={[{ required: true, message: '请填写原因' }]}>
            <Input.TextArea rows={3} placeholder="如：运输途中损坏、仓储过久枯萎等" />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <Input placeholder="可选" />
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

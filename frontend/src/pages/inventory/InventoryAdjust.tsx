import { useEffect, useState } from 'react'
import { Form, Select, InputNumber, Input, Button, Table, Tag, App } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getInventory, getAdjustments, createAdjustment, type InventoryRow, type InventoryAdjustment } from '@/api/inventory'
import { getErrorMessage } from '@/utils/error'
import styles from './Inventory.module.css'

const TYPE_LABEL: Record<string, string> = {
  in:     '入库',
  out:    '出库',
  adjust: '调整',
}

const TYPE_COLOR: Record<string, string> = {
  in:     'green',
  out:    'red',
  adjust: 'blue',
}

export default function InventoryAdjust() {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const [products, setProducts] = useState<InventoryRow[]>([])
  const [history, setHistory] = useState<InventoryAdjustment[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getInventory().then(setProducts).catch(() => {})
    getAdjustments().then(setHistory).catch(() => {})
  }, [])

  const handleSubmit = () => {
    form.validateFields().then(values => {
      setSaving(true)
      const product = products.find(p => p.productId === values.productId)
      const currentStock = product?.stock ?? 0
      const qty = Number(values.qty)
      const qtyNew = values.adjustType === '盘亏'
        ? currentStock - Math.abs(qty)
        : currentStock + Math.abs(qty)

      createAdjustment({
        productId: values.productId,
        qtyNew,
        reason: values.reason ?? '',
      })
        .then(record => {
          message.success('库存调整成功')
          setHistory(prev => [record, ...prev])
          form.resetFields()
        })
        .catch(err => message.error(getErrorMessage(err)))
        .finally(() => setSaving(false))
    })
  }

  const historyColumns: ColumnsType<InventoryAdjustment> = [
    { title: '时间', dataIndex: 'createdAt', width: 110 },
    { title: '编码', dataIndex: 'productCode', width: 100 },
    { title: '货品名称', dataIndex: 'productName' },
    {
      title: '类型', dataIndex: 'type', width: 80, align: 'center',
      render: (v: string) => <Tag color={TYPE_COLOR[v] ?? 'default'}>{TYPE_LABEL[v] ?? v}</Tag>,
    },
    {
      title: '变动数量', dataIndex: 'qtyChange', width: 90, align: 'center',
      render: (v: number) => (
        <span style={{ color: v > 0 ? '#389e0d' : '#cf1322', fontWeight: 600 }}>
          {v > 0 ? `+${v}` : v}
        </span>
      ),
    },
    { title: '调后数量', dataIndex: 'qtyAfter', width: 90, align: 'center' },
    { title: '原因', dataIndex: 'reason' },
    { title: '操作人', dataIndex: 'operator', width: 90 },
  ]

  return (
    <>
      <div className={styles.pageTitle}>库存调整</div>

      <div className={styles.card}>
        <div className={styles.sectionTitle}>新建调整</div>
        <Form form={form} layout="inline">
          <Form.Item name="productId" label="货品" rules={[{ required: true, message: '请选择货品' }]}>
            <Select
              showSearch
              placeholder="选择货品"
              style={{ width: 220 }}
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={products.map(p => ({
                value: p.productId,
                label: `${p.productCode} ${p.productName}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="adjustType" label="类型" initialValue="盘亏" rules={[{ required: true }]}>
            <Select style={{ width: 90 }} options={[
              { value: '盘亏', label: '盘亏' },
              { value: '盘盈', label: '盘盈' },
            ]} />
          </Form.Item>
          <Form.Item name="qty" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} style={{ width: 90 }} placeholder="数量" />
          </Form.Item>
          <Form.Item name="reason" label="原因">
            <Input placeholder="可选" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" loading={saving} onClick={handleSubmit}>提交调整</Button>
          </Form.Item>
        </Form>
      </div>

      <div className={styles.sectionTitle}>调整记录</div>
      <Table
        rowKey="id"
        columns={historyColumns}
        dataSource={history}
        pagination={{ pageSize: 15 }}
        size="small"
      />
    </>
  )
}

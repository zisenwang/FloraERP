import { useEffect, useState } from 'react'
import { Table, InputNumber, Button, Tag, App, Popconfirm } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getInventory, createAdjustment, type InventoryItem } from '@/api/inventory'
import { getErrorMessage } from '@/utils/error'
import styles from './Inventory.module.css'

interface CheckRow extends InventoryItem {
  actual: number | null  // null = not counted yet
}

export default function InventoryCheck() {
  const { message } = App.useApp()
  const [rows, setRows] = useState<CheckRow[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    getInventory()
      .then(items => setRows(items.map(i => ({ ...i, actual: null }))))
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const setActual = (id: number, val: number | null) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, actual: val } : r))
  }

  const handleSubmit = async () => {
    const diffs = rows.filter(r => r.actual !== null && r.actual !== r.stock)
    if (diffs.length === 0) {
      message.info('盘点数量与系统一致，无需调整')
      return
    }
    setSubmitting(true)
    try {
      for (const row of diffs) {
        const diff = (row.actual as number) - row.stock
        await createAdjustment({
          product_code: row.product_code,
          product_name: row.product_name,
          adjust_type: diff > 0 ? '盘盈' : '盘亏',
          qty: diff,
          reason: '库存盘点',
        })
      }
      message.success(`盘点完成，已调整 ${diffs.length} 个品种`)
      // Reset actual counts
      setRows(prev => prev.map(r => ({ ...r, actual: null })))
    } catch (err) {
      message.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const countedRows = rows.filter(r => r.actual !== null)
  const diffRows = rows.filter(r => r.actual !== null && r.actual !== r.stock)

  const columns: ColumnsType<CheckRow> = [
    { title: '编码', dataIndex: 'product_code', width: 100 },
    { title: '货品名称', dataIndex: 'product_name', width: 160 },
    { title: '供应商', dataIndex: 'supplier_name', width: 100 },
    { title: '单位', dataIndex: 'unit', width: 70, align: 'center' },
    {
      title: '系统库存', dataIndex: 'stock', width: 100, align: 'center',
      render: (v: number) => <strong>{v}</strong>,
    },
    {
      title: '实盘数量', width: 110, align: 'center',
      render: (_: unknown, record: CheckRow) => (
        <InputNumber
          min={0}
          value={record.actual ?? undefined}
          placeholder="输入数量"
          style={{ width: 90 }}
          onChange={val => setActual(record.id, val)}
        />
      ),
    },
    {
      title: '差异', width: 90, align: 'center',
      render: (_: unknown, record: CheckRow) => {
        if (record.actual === null) return <span style={{ color: '#ccc' }}>—</span>
        const diff = record.actual - record.stock
        if (diff === 0) return <Tag color="green">一致</Tag>
        return (
          <span className={diff > 0 ? styles.diffNeg : styles.diffPos}>
            {diff > 0 ? `+${diff}` : diff}
          </span>
        )
      },
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>库存盘点</div>

      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: '#555' }}>
          已盘点：<strong>{countedRows.length}</strong> / {rows.length}&emsp;
          有差异：<strong style={{ color: diffRows.length > 0 ? '#cf1322' : '#389e0d' }}>{diffRows.length}</strong>
        </span>
        <Popconfirm
          title={`将对 ${diffRows.length} 个品种提交库存调整，确认吗？`}
          onConfirm={handleSubmit}
          disabled={countedRows.length === 0}
          okText="确认提交"
          cancelText="取消"
        >
          <Button
            type="primary"
            icon={<CheckOutlined />}
            loading={submitting}
            disabled={countedRows.length === 0}
          >
            提交盘点结果
          </Button>
        </Popconfirm>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
        size="small"
      />
    </>
  )
}

import { useEffect, useState } from 'react'
import { Table, Select, Tag, App } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getInventoryReport, type InventoryReportData } from '@/api/reports'
import { getErrorMessage } from '@/utils/error'
import type { InventoryItem } from '@/api/inventory'
import styles from './Reports.module.css'

const CATEGORIES = ['观叶植物', '兰花', '观花植物', '多肉植物', '绿植']

export default function InventoryReport() {
  const { message } = App.useApp()
  const [data, setData] = useState<InventoryReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState<string | undefined>()

  useEffect(() => {
    setLoading(true)
    getInventoryReport({ category })
      .then(setData)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [category])

  const columns: ColumnsType<InventoryItem> = [
    { title: '编码', dataIndex: 'product_code', width: 100 },
    { title: '货品名称', dataIndex: 'product_name', width: 160 },
    { title: '供应商', dataIndex: 'supplier_name', width: 100 },
    {
      title: '分类', dataIndex: 'category', width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: '单位', dataIndex: 'unit', width: 70, align: 'center' },
    {
      title: '当前库存', dataIndex: 'stock', width: 100, align: 'center',
      render: (v: number, record: InventoryItem) => {
        const low = v <= record.alert_stock
        return (
          <span style={{ color: low ? '#cf1322' : '#111', fontWeight: low ? 600 : 400 }}>
            {low && <WarningOutlined style={{ marginRight: 4 }} />}
            {v}
          </span>
        )
      },
    },
    { title: '预警库存', dataIndex: 'alert_stock', width: 90, align: 'center',
      render: (v: number) => <span style={{ color: '#999' }}>{v}</span>,
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>库存报表</div>

      <div className={styles.toolbar}>
        <Select
          allowClear placeholder="所有分类"
          style={{ width: 140 }}
          options={CATEGORIES.map(c => ({ value: c, label: c }))}
          onChange={v => setCategory(v)}
        />
      </div>

      {data && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>品种总数</div>
            <div className={styles.statValue}>{data.total_items}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>库存不足品种</div>
            <div className={data.low_stock_count > 0 ? styles.statValueRed : styles.statValue}>
              {data.low_stock_count}
            </div>
          </div>
        </div>
      )}

      {data && data.low_stock_count > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6, fontSize: 13 }}>
          <WarningOutlined style={{ color: '#cf1322', marginRight: 8 }} />
          库存不足商品：{data.low_stock_items.map(i => `${i.product_name}（${i.stock}）`).join('、')}
        </div>
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.inventory ?? []}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
        size="small"
      />
    </>
  )
}

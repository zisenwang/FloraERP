import { useEffect, useState } from 'react'
import { Table, Select, Tag, App } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getInventoryReport, type InventoryReportData, type InventoryReportItem } from '@/api/reports'
import { getErrorMessage } from '@/utils/error'
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

  const columns: ColumnsType<InventoryReportItem> = [
    { title: '编码', dataIndex: 'productCode', width: 100 },
    { title: '货品名称', dataIndex: 'productName', width: 160 },
    { title: '供应商', dataIndex: 'supplierName', width: 100 },
    {
      title: '分类', dataIndex: 'category', width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: '单位', dataIndex: 'unit', width: 70, align: 'center' },
    {
      title: '当前库存', dataIndex: 'stock', width: 100, align: 'center',
      render: (v: number) => <span>{v}</span>,
    },
    {
      title: '单价', dataIndex: 'price', width: 90, align: 'right',
      render: (v: number) => `¥${v.toFixed(2)}`,
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
            <div className={styles.statValue}>{data.totalItems}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>库存总量</div>
            <div className={styles.statValue}>{data.totalStock}</div>
          </div>
        </div>
      )}

      <Table
        rowKey="productId"
        columns={columns}
        dataSource={data?.inventory ?? []}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
        size="small"
      />
    </>
  )
}

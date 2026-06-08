import { useEffect, useState } from 'react'
import { Table, Input, Select, Tag, App } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getInventory, type InventoryRow } from '@/api/inventory'
import { getErrorMessage } from '@/utils/error'
import styles from './Inventory.module.css'

const CATEGORIES = ['观叶植物', '兰花', '观花植物', '多肉植物', '绿植']

export default function InventoryList() {
  const { message } = App.useApp()
  const [items, setItems] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | undefined>()

  const fetchInventory = () => {
    setLoading(true)
    getInventory({ search: search || undefined, category })
      .then(setItems)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchInventory() }, [search, category])

  const columns: ColumnsType<InventoryRow> = [
    { title: '编码', dataIndex: 'productCode', width: 100 },
    { title: '货品名称', dataIndex: 'productName', width: 160 },
    { title: '供应商', dataIndex: 'supplierName', width: 100 },
    {
      title: '分类', dataIndex: 'category', width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: '单位', dataIndex: 'unit', width: 70, align: 'center' },
    {
      title: '当前库存', dataIndex: 'stock', width: 110, align: 'center',
      render: (v: number) => (
        <span className={styles.stockOk}>
          {v}
        </span>
      ),
    },
    { title: '最后更新', dataIndex: 'lastUpdated', width: 110 },
  ]

  return (
    <>
      <div className={styles.pageTitle}>产品库存</div>

      <div className={styles.toolbar}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索编码或名称"
          style={{ width: 200 }}
          allowClear
          onChange={e => setSearch(e.target.value)}
        />
        <Select
          allowClear placeholder="分类筛选"
          style={{ width: 140 }}
          options={CATEGORIES.map(c => ({ value: c, label: c }))}
          onChange={v => setCategory(v)}
        />
      </div>

      <Table
        rowKey="productId"
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
        size="small"
      />
    </>
  )
}

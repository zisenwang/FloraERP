import { useEffect, useState, useMemo } from 'react'
import { Table, Select, Tag, App, Input } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getInventoryReport, type InventoryReportItem } from '@/api/reports'
import { getSuppliers, type Supplier } from '@/api/suppliers'
import { getErrorMessage } from '@/utils/error'
import styles from './Reports.module.css'

const CATEGORIES = ['观叶植物', '兰花', '观花植物', '多肉植物', '绿植']

export default function InventoryReport() {
  const { message } = App.useApp()
  const [inventory, setInventory] = useState<InventoryReportItem[]>([])
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState<string | undefined>()
  const [supplierId, setSupplierId] = useState<number | undefined>()
  const [itemSearch, setItemSearch] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getInventoryReport({ category, supplierId })
      .then(d => setInventory(d.inventory))
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [category, supplierId])

  const filteredItems = useMemo(() =>
    itemSearch
      ? inventory.filter(r =>
          r.productCode.toLowerCase().includes(itemSearch.toLowerCase()) ||
          r.productName.toLowerCase().includes(itemSearch.toLowerCase())
        )
      : inventory,
    [inventory, itemSearch]
  )

  const totalStock = filteredItems.reduce((s, r) => s + Number(r.stock), 0)

  const columns: ColumnsType<InventoryReportItem> = [
    { title: '编码', dataIndex: 'productCode', width: 100 },
    { title: '货品名称', dataIndex: 'productName', width: 160 },
    { title: '供应商', dataIndex: 'supplierName', width: 120 },
    {
      title: '分类', dataIndex: 'category', width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: '单位', dataIndex: 'unit', width: 70, align: 'center' },
    {
      title: '当前库存', dataIndex: 'stock', width: 100, align: 'center',
      render: (v: number) => <span style={{ fontWeight: v === 0 ? undefined : 500 }}>{v}</span>,
    },
    {
      title: '单价', dataIndex: 'price', width: 90, align: 'right',
      render: (v: number) => v != null ? `¥${v.toFixed(2)}` : '—',
    },
  ]

  const supplierOptions = suppliers.map(s => ({
    value: s.id,
    label: `${s.code} ${s.name}`,
  }))

  return (
    <>
      <div className={styles.pageTitle}>库存报表</div>

      <div className={styles.toolbar}>
        <Input
          placeholder="搜索货品名称/编码"
          allowClear
          style={{ width: 220 }}
          value={itemSearch}
          onChange={e => setItemSearch(e.target.value)}
        />
        <Select
          allowClear
          showSearch={{ filterOption: (input, opt) =>
            (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
          }}
          placeholder="所有供应商"
          style={{ width: 200 }}
          options={supplierOptions}
          onChange={val => setSupplierId(val ?? undefined)}
        />
        <Select
          allowClear placeholder="所有分类"
          style={{ width: 140 }}
          options={CATEGORIES.map(c => ({ value: c, label: c }))}
          onChange={v => setCategory(v)}
        />
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard} style={{ flex: 'none', minWidth: 300 }}>
          <div className={styles.statLabel}>品种数</div>
          <div className={styles.statValue}>{filteredItems.length}</div>
        </div>
        <div className={styles.statCard} style={{ flex: 'none', minWidth: 300 }}>
          <div className={styles.statLabel}>库存总量</div>
          <div className={styles.statValue}>{totalStock}</div>
        </div>
      </div>

      <Table
        rowKey="productId"
        columns={columns}
        dataSource={filteredItems}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
        size="small"
      />
    </>
  )
}

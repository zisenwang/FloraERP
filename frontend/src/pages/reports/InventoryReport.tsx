import { useEffect, useState, useMemo } from 'react'
import { Table, Select, Tag, App, Input, Button, Space } from 'antd'
import { SearchOutlined, DownloadOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getInventoryReport, type InventoryReportItem } from '@/api/reports'
import { getProductCategories } from '@/api/products'
import { getErrorMessage } from '@/utils/error'
import { exportInventoryExcel } from '@/utils/exportExcel'
import { PAGE_SIZE } from '@/constants/pagination'
import styles from './Reports.module.css'

type SortField = 'stock' | 'pieces' | 'productCode'

function getPieces(r: InventoryReportItem) {
  return r.unitsPerPiece ? Math.ceil(r.stock / r.unitsPerPiece) : null
}

export default function InventoryReport() {
  const { message } = App.useApp()
  const [inventory, setInventory] = useState<InventoryReportItem[]>([])
  const [loading, setLoading] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [categories, setCategories] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('stock')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    getProductCategories().then(setCategories).catch(() => {})
    setLoading(true)
    getInventoryReport()
      .then(d => { setInventory(d.inventory); setCurrentPage(1) })
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const sortedItems = useMemo(() => {
    const filtered = inventory.filter(r => {
      const kw = itemSearch.toLowerCase()
      const matchSearch = !kw ||
        r.productCode.toLowerCase().includes(kw) ||
        r.productName.toLowerCase().includes(kw)
      const matchCategory = !categoryFilter || r.category === categoryFilter
      return matchSearch && matchCategory
    })
    filtered.sort((a, b) => {
      let va: number | string
      let vb: number | string
      if (sortField === 'stock') {
        va = a.stock; vb = b.stock
      } else if (sortField === 'pieces') {
        va = getPieces(a) ?? 0; vb = getPieces(b) ?? 0
      } else {
        va = a.productCode; vb = b.productCode
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return filtered
  }, [inventory, itemSearch, categoryFilter, sortField, sortDir])

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedItems.slice(start, start + PAGE_SIZE)
  }, [sortedItems, currentPage])

  const totalQty    = sortedItems.reduce((s, r) => s + Number(r.stock), 0)
  const totalPieces = sortedItems.reduce((s, r) => s + (getPieces(r) ?? 0), 0)
  const pageQty     = pageItems.reduce((s, r) => s + Number(r.stock), 0)
  const pagePieces  = pageItems.reduce((s, r) => s + (getPieces(r) ?? 0), 0)

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'productCode' ? 'asc' : 'desc')
    }
    setCurrentPage(1)
  }

  function SortBtn({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field
    const icon = active
      ? (sortDir === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)
      : null
    return (
      <Button size="small" type={active ? 'primary' : 'default'} icon={icon} onClick={() => toggleSort(field)}>
        {label}
      </Button>
    )
  }

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
      title: '件数', width: 80, align: 'center',
      render: (_: unknown, r: InventoryReportItem) =>
        r.unitsPerPiece ? Math.ceil(r.stock / r.unitsPerPiece) : '—',
    },
    {
      title: '成本价', dataIndex: 'costPrice', width: 90, align: 'right',
      render: (v: number) => v != null ? `¥${v.toFixed(2)}` : '—',
    },
    {
      title: '售价', dataIndex: 'price', width: 90, align: 'right',
      render: (v: number) => v != null ? `¥${v.toFixed(2)}` : '—',
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>库存报表</div>

      <div className={styles.toolbar}>
        <Input
          placeholder="搜索货品名称/编码"
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 220 }}
          value={itemSearch}
          onChange={e => { setItemSearch(e.target.value); setCurrentPage(1) }}
        />
        <Select
          allowClear
          showSearch={{ filterOption: (input, opt) =>
            (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
          }}
          placeholder="按分类筛选"
          style={{ width: 160 }}
          options={categories.map(c => ({ value: c, label: c }))}
          onChange={val => { setCategoryFilter(val); setCurrentPage(1) }}
        />
        <Space size={4}>
          <span style={{ fontSize: 12, color: '#888' }}>排序：</span>
          <SortBtn field="stock" label="数量" />
          <SortBtn field="pieces" label="件数" />
          <SortBtn field="productCode" label="编码" />
        </Space>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => exportInventoryExcel(sortedItems)}
          disabled={sortedItems.length === 0}
          style={{ marginLeft: 'auto' }}
        >
          导出 Excel
        </Button>
      </div>

      <Table
        rowKey="productId"
        columns={columns}
        dataSource={sortedItems}
        loading={loading}
        pagination={{
          pageSize: PAGE_SIZE,
          current: currentPage,
          onChange: (p) => setCurrentPage(p),
          showTotal: total => `共 ${total} 条`,
        }}
        size="small"
        summary={() => (
          <Table.Summary fixed="bottom">
            <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 500 }}>
              <Table.Summary.Cell index={0} colSpan={5}>本页小计</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="center">{pageQty}</Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="center">{pagePieces}</Table.Summary.Cell>
              <Table.Summary.Cell index={3} />
              <Table.Summary.Cell index={4} />
            </Table.Summary.Row>
            <Table.Summary.Row style={{ background: '#f0f5ff', fontWeight: 600 }}>
              <Table.Summary.Cell index={0} colSpan={5}>全部合计（{sortedItems.length} 种）</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="center">{totalQty}</Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="center">{totalPieces}</Table.Summary.Cell>
              <Table.Summary.Cell index={3} />
              <Table.Summary.Cell index={4} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </>
  )
}

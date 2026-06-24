import { useEffect, useState, useMemo } from 'react'
import { Table, Input, Select, Tag, App, Button, Space } from 'antd'
import { SearchOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getInventory, type InventoryRow } from '@/api/inventory'
import { getErrorMessage } from '@/utils/error'
import { PAGE_SIZE } from '@/constants/pagination'
import styles from './Inventory.module.css'

type SortField = 'stock' | 'pieces' | 'productCode'

function getPieces(r: InventoryRow) {
  return r.unitsPerPiece ? Math.ceil(r.stock / r.unitsPerPiece) : null
}

export default function InventoryList() {
  const { message } = App.useApp()
  const [items, setItems] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState<string | undefined>()
  const [sortField, setSortField] = useState<SortField>('stock')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    getInventory()
      .then(data => setItems(data))
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const supplierOptions = useMemo(() => {
    const seen = new Map<string, string>()
    items.forEach(r => { if (r.supplierCode) seen.set(r.supplierCode, r.supplierName) })
    return Array.from(seen.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([code, name]) => ({ label: `${code} ${name}`, value: code }))
  }, [items])

  const sortedItems = useMemo(() => {
    const filtered = items.filter(r => {
      const kw = search.toLowerCase()
      const matchSearch = !kw ||
        r.productName.toLowerCase().includes(kw) ||
        r.productCode.toLowerCase().includes(kw)
      const matchSupplier = !supplierFilter || r.supplierCode === supplierFilter
      return matchSearch && matchSupplier
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
  }, [items, search, supplierFilter, sortField, sortDir])

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedItems.slice(start, start + PAGE_SIZE)
  }, [sortedItems, currentPage])

  const totalQty    = sortedItems.reduce((s, r) => s + r.stock, 0)
  const totalPieces = sortedItems.reduce((s, r) => s + (getPieces(r) ?? 0), 0)
  const pageQty     = pageItems.reduce((s, r) => s + r.stock, 0)
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
      <Button
        size="small"
        type={active ? 'primary' : 'default'}
        icon={icon}
        onClick={() => toggleSort(field)}
      >
        {label}
      </Button>
    )
  }

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
      title: '当前库存', dataIndex: 'stock', width: 100, align: 'center',
      render: (v: number) => <span className={styles.stockOk}>{v}</span>,
    },
    {
      title: '件数', width: 80, align: 'center',
      render: (_: unknown, r: InventoryRow) =>
        r.unitsPerPiece ? Math.ceil(r.stock / r.unitsPerPiece) : '—',
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
          onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
        />
        <Select
          allowClear
          showSearch={{ filterOption: (input, opt) =>
            (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
          }}
          placeholder="按供应商筛选"
          style={{ width: 180 }}
          options={supplierOptions}
          onChange={val => { setSupplierFilter(val); setCurrentPage(1) }}
        />
        <Space size={4}>
          <span style={{ fontSize: 12, color: '#888' }}>排序：</span>
          <SortBtn field="stock" label="数量" />
          <SortBtn field="pieces" label="件数" />
          <SortBtn field="productCode" label="编码" />
        </Space>
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
            </Table.Summary.Row>
            <Table.Summary.Row style={{ background: '#f0f5ff', fontWeight: 600 }}>
              <Table.Summary.Cell index={0} colSpan={5}>全部合计（{sortedItems.length} 种）</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="center">{totalQty}</Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="center">{totalPieces}</Table.Summary.Cell>
              <Table.Summary.Cell index={3} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </>
  )
}

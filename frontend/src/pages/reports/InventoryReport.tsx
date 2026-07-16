import { useEffect, useState, useMemo } from 'react'
import { Table, Select, Tag, App, Input, Button } from 'antd'
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons'
import type { ColumnsType, SorterResult } from 'antd/es/table/interface'
import { getInventoryReport, type InventoryReportItem } from '@/api/reports'
import { getProductCategories } from '@/api/products'
import { getErrorMessage } from '@/utils/error'
import { exportInventoryExcel } from '@/utils/exportExcel'
import { PAGE_SIZE } from '@/constants/pagination'
import styles from './Reports.module.css'

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
  const [sortKey, setSortKey] = useState<string>('stock')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend')
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

    const dir = sortOrder === 'descend' ? -1 : 1
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'productName':   cmp = a.productName.localeCompare(b.productName); break
        case 'supplierName':  cmp = a.supplierName.localeCompare(b.supplierName); break
        case 'category':      cmp = (a.category ?? '').localeCompare(b.category ?? ''); break
        case 'unit':          cmp = a.unit.localeCompare(b.unit); break
        case 'stock':         cmp = a.stock - b.stock; break
        case 'pieces':        cmp = (getPieces(a) ?? 0) - (getPieces(b) ?? 0); break
        case 'unitsPerPiece': cmp = (a.unitsPerPiece ?? 0) - (b.unitsPerPiece ?? 0); break
        case 'costPrice':     cmp = (a.costPrice ?? 0) - (b.costPrice ?? 0); break
        case 'price':         cmp = (a.price ?? 0) - (b.price ?? 0); break
        default:              cmp = a.productCode.localeCompare(b.productCode)
      }
      return dir * cmp
    })
  }, [inventory, itemSearch, categoryFilter, sortKey, sortOrder])

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedItems.slice(start, start + PAGE_SIZE)
  }, [sortedItems, currentPage])

  const totalQty    = sortedItems.reduce((s, r) => s + Number(r.stock), 0)
  const totalPieces = sortedItems.reduce((s, r) => s + (getPieces(r) ?? 0), 0)
  const pageQty     = pageItems.reduce((s, r) => s + Number(r.stock), 0)
  const pagePieces  = pageItems.reduce((s, r) => s + (getPieces(r) ?? 0), 0)

  const col = (key: string) => ({
    key,
    sorter: () => 0 as number,
    sortOrder: (sortKey === key ? sortOrder : undefined) as 'ascend' | 'descend' | undefined,
    showSorterTooltip: false,
  })

  const columns: ColumnsType<InventoryReportItem> = [
    { ...col('productCode'),  title: '编码',     dataIndex: 'productCode',  width: 100 },
    { ...col('productName'),  title: '货品名称',  dataIndex: 'productName',  width: 160 },
    { ...col('supplierName'), title: '供应商',    dataIndex: 'supplierName', width: 120 },
    {
      ...col('category'),
      title: '分类', dataIndex: 'category', width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { ...col('unit'), title: '单位', dataIndex: 'unit', width: 70, align: 'center' },
    {
      ...col('stock'),
      title: '当前库存', dataIndex: 'stock', width: 100, align: 'center',
      render: (v: number) => <span style={{ fontWeight: v === 0 ? undefined : 500 }}>{v}</span>,
    },
    {
      ...col('pieces'),
      title: '件数', width: 80, align: 'center',
      render: (_: unknown, r: InventoryReportItem) =>
        r.unitsPerPiece ? Math.ceil(r.stock / r.unitsPerPiece) : '—',
    },
    {
      ...col('unitsPerPiece'),
      title: '每件数量', dataIndex: 'unitsPerPiece', width: 70, align: 'center',
      render: (v: number | null) => v ?? '—',
    },
    {
      ...col('costPrice'),
      title: '成本价', dataIndex: 'costPrice', width: 90, align: 'right',
      render: (v: number) => v != null ? `¥${v.toFixed(2)}` : '—',
    },
    {
      ...col('price'),
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
        onChange={(_pagination, _filters, sorter) => {
          const s = Array.isArray(sorter) ? sorter[0] : sorter as SorterResult<InventoryReportItem>
          if (s.columnKey && s.order) {
            setSortKey(s.columnKey as string)
            setSortOrder(s.order)
          } else {
            setSortKey('stock')
            setSortOrder('descend')
          }
          setCurrentPage(1)
        }}
        summary={() => (
          <Table.Summary fixed="bottom">
            <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 500 }}>
              <Table.Summary.Cell index={1} colSpan={4} />
              <Table.Summary.Cell index={2}>本页小计</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="center">{pageQty}</Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="center">{pagePieces}</Table.Summary.Cell>
              <Table.Summary.Cell index={6} colSpan={3} />
            </Table.Summary.Row>
            <Table.Summary.Row style={{ background: '#f0f5ff', fontWeight: 600 }}>
              <Table.Summary.Cell index={0} colSpan={5} align="right">全部合计（{sortedItems.length} 种）</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="center">{totalQty}</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="center">{totalPieces}</Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={3} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </>
  )
}

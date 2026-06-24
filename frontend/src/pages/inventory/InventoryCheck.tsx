import { useEffect, useState, useMemo } from 'react'
import { Table, InputNumber, Button, Tag, App, Popconfirm, Input, Select, Space } from 'antd'
import { CheckOutlined, SearchOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getInventory, createAdjustment, type InventoryRow } from '@/api/inventory'
import { getProductCategories } from '@/api/products'
import { getErrorMessage } from '@/utils/error'
import { PAGE_SIZE } from '@/constants/pagination'
import styles from './Inventory.module.css'

interface CheckRow extends InventoryRow {
  actual: number | null  // null = not counted yet
}

type SortField = 'stock' | 'pieces' | 'productCode'

function getPieces(r: InventoryRow) {
  return r.unitsPerPiece ? Math.ceil(r.stock / r.unitsPerPiece) : null
}

export default function InventoryCheck() {
  const { message } = App.useApp()
  const [rows, setRows] = useState<CheckRow[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [categories, setCategories] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('stock')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    getProductCategories().then(setCategories).catch(() => {})
    setLoading(true)
    getInventory()
      .then(items => setRows(items.map(i => ({ ...i, actual: null }))))
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const setActual = (productId: number, val: number | null) => {
    setRows(prev => prev.map(r => r.productId === productId ? { ...r, actual: val } : r))
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
        await createAdjustment({
          productId: row.productId,
          qtyNew: row.actual as number,
          reason: '库存盘点',
        })
      }
      message.success(`盘点完成，已调整 ${diffs.length} 个品种`)
      setRows(prev => prev.map(r => ({ ...r, actual: null })))
    } catch (err) {
      message.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const sortedRows = useMemo(() => {
    const filtered = rows.filter(r => {
      const kw = search.toLowerCase()
      const matchSearch = !kw ||
        r.productName.toLowerCase().includes(kw) ||
        r.productCode.toLowerCase().includes(kw)
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
  }, [rows, search, categoryFilter, sortField, sortDir])

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

  const countedRows = rows.filter(r => r.actual !== null)
  const diffRows = rows.filter(r => r.actual !== null && r.actual !== r.stock)
  const countedInView = sortedRows.filter(r => r.actual !== null).length

  const columns: ColumnsType<CheckRow> = [
    { title: '编码', dataIndex: 'productCode', width: 100 },
    { title: '货品名称', dataIndex: 'productName', width: 160 },
    { title: '供应商', dataIndex: 'supplierName', width: 100 },
    { title: '单位', dataIndex: 'unit', width: 70, align: 'center' },
    {
      title: '系统库存', dataIndex: 'stock', width: 100, align: 'center',
      render: (v: number) => <strong>{v}</strong>,
    },
    {
      title: '件数', width: 80, align: 'center',
      render: (_: unknown, r: CheckRow) =>
        r.unitsPerPiece ? Math.ceil(r.stock / r.unitsPerPiece) : '—',
    },
    {
      title: '实盘数量', width: 110, align: 'center',
      render: (_: unknown, record: CheckRow) => (
        <InputNumber
          min={0}
          value={record.actual ?? undefined}
          placeholder="输入数量"
          style={{ width: 90 }}
          onChange={val => setActual(record.productId, val)}
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

      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Input
          placeholder="搜索编码或名称"
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ width: 200 }}
        />
        <Select
          placeholder="按分类筛选"
          allowClear
          showSearch={{ filterOption: (input, opt) =>
            (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
          }}
          style={{ width: 140 }}
          options={categories.map(c => ({ value: c, label: c }))}
          onChange={val => { setCategoryFilter(val); setCurrentPage(1) }}
        />
        <Space size={4}>
          <span style={{ fontSize: 12, color: '#888' }}>排序：</span>
          <SortBtn field="stock" label="数量" />
          <SortBtn field="pieces" label="件数" />
          <SortBtn field="productCode" label="编码" />
        </Space>
        <span style={{ fontSize: 13, color: '#555' }}>
          已盘点：<strong>{countedRows.length}</strong> / {rows.length}（当前视图 {countedInView}/{sortedRows.length}）&emsp;
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
        rowKey="productId"
        columns={columns}
        dataSource={sortedRows}
        loading={loading}
        pagination={{
          pageSize: PAGE_SIZE,
          current: currentPage,
          onChange: (p) => setCurrentPage(p),
          showTotal: total => `共 ${total} 条`,
        }}
        size="small"
      />
    </>
  )
}

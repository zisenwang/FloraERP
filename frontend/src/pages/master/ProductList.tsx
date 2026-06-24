import { useEffect, useState } from 'react'
import { Table, Button, Input, Modal, Form, App, Tag, Select, InputNumber, Space } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  getProducts, createProduct, updateProduct, deleteProduct, getNextProductCode,
  type Product, type ProductPayload,
} from '@/api/products'
import { getSuppliers, type Supplier } from '@/api/suppliers'
import { getErrorMessage } from '@/utils/error'
import styles from './SupplierList.module.css'


export default function ProductList() {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<ProductPayload>()

  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterSupplierId, setFilterSupplierId] = useState<number | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)

  // Split code state: prefix is the supplier code (read-only), seq is the editable part
  const [supplierCodePrefix, setSupplierCodePrefix] = useState('')
  const [codeSeq, setCodeSeq] = useState('')

  const fetchProducts = (kw?: string, supplierId?: number) => {
    setLoading(true)
    getProducts({ search: kw, supplierId })
      .then(setProducts)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchProducts()
    getSuppliers().then(setSuppliers).catch(() => {})
  }, [])

  const applyNextCode = (supplierId: number) => {
    setCodeLoading(true)
    getNextProductCode(supplierId).then(seq => {
      const padded = seq.padStart(2, '0')
      setCodeSeq(padded)
      form.setFieldValue('code', padded)
    }).catch(() => {}).finally(() => setCodeLoading(false))
  }

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    setSupplierCodePrefix('')
    setCodeSeq('')
    if (filterSupplierId) {
      const supplier = suppliers.find(s => s.id === filterSupplierId)
      setSupplierCodePrefix(supplier?.code ?? '')
      applyNextCode(filterSupplierId)
    }
    setModalOpen(true)
  }

  const openEdit = (record: Product) => {
    setEditing(record)
    setSupplierCodePrefix(record.supplierCode ?? '')
    // record.code from API is already full 'XXX.yy'; extract the seq part for the editable field
    const seq = record.code.split('.').slice(1).join('.')
    setCodeSeq(seq)
    form.setFieldsValue({ ...record, code: seq })
    setModalOpen(true)
  }

  const handleSupplierChange = (supplierId: number) => {
    const supplier = suppliers.find(s => s.id === supplierId)
    const prefix = supplier?.code ?? ''
    setSupplierCodePrefix(prefix)
    if (!editing) {
      applyNextCode(supplierId)
    } else {
      // When editing and supplier changes, keep seq as-is (code field holds seq only)
      form.setFieldValue('code', codeSeq)
    }
  }

  const handleSeqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seq = e.target.value
    setCodeSeq(seq)
    form.setFieldValue('code', seq)
  }

  const handleSave = () => {
    form.validateFields().then(values => {
      setSaving(true)
      const req = editing
        ? updateProduct(editing.id, values)
        : createProduct(values)

      req
        .then(() => {
          message.success(editing ? '更新成功' : '添加成功')
          setModalOpen(false)
          fetchProducts(search, filterSupplierId)
        })
        .catch(err => message.error(getErrorMessage(err)))
        .finally(() => setSaving(false))
    })
  }

  const handleDelete = (record: Product) => {
    modal.confirm({
      title: '确认删除',
      content: `删除货品「${record.name}」？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () =>
        deleteProduct(record.id)
          .then(() => {
            message.success('删除成功')
            fetchProducts(search, filterSupplierId)
          })
          .catch(err => message.error(getErrorMessage(err))),
    })
  }

  const columns: ColumnsType<Product> = [
    { title: '编码', dataIndex: 'code', width: 100 },
    { title: '货品名称', dataIndex: 'name', width: 140 },
    { title: '供应商', dataIndex: 'supplierName', width: 100 },
    { title: '品类', dataIndex: 'category', width: 100 },
    { title: '等级', dataIndex: 'grade', width: 80, render: (v: string) => v ?? '—' },
    { title: '单位', dataIndex: 'unit', width: 60 },
    { title: '每件数量', dataIndex: 'unitsPerPiece', width: 70, render: (v: number) => v ?? '—' },
    { title: '最新进价', dataIndex: 'costPrice', width: 90, render: (v: number) => v ? `¥${v}` : '—' },
    { title: '单价', dataIndex: 'price', width: 80, render: (v: number) => v != null ? `¥${v}` : '—' },
    { title: '库存', dataIndex: 'stock', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: number) => v === 1
        ? <Tag color="green">启用</Tag>
        : <Tag color="default">停用</Tag>,
    },
    {
      title: '操作', width: 100, fixed: 'right',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </div>
      ),
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>货品管理</div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="搜索编码或名称"
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={() => fetchProducts(search, filterSupplierId)}
            allowClear
            style={{ width: 200 }}
          />
          <Select
            placeholder="按供应商筛选"
            allowClear
            style={{ width: 160 }}
            options={suppliers.map(s => ({ value: s.id, label: `${s.code} ${s.name}` }))}
            onChange={val => {
              setFilterSupplierId(val)
              fetchProducts(search, val)
            }}
          />
          <Button icon={<SearchOutlined />} onClick={() => fetchProducts(search, filterSupplierId)}>搜索</Button>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增货品</Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={products}
        loading={loading}
        size="middle"
        scroll={{ x: 900 }}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
      />

      <Modal
        title={editing ? '编辑货品' : '新增货品'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="supplierId" label="供应商" rules={[{ required: true, message: '请选择供应商' }]}>
            <Select
              placeholder="选择供应商"
              showSearch={{ filterOption: (input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }}
              options={suppliers.map(s => ({ value: s.id, label: `${s.code} ${s.name}` }))}
              onChange={handleSupplierChange}
            />
          </Form.Item>

          {/* Hidden field holds the full combined code for form validation */}
          <Form.Item name="code" hidden rules={[{ required: true, message: '请输入货品编码' }]}>
            <Input />
          </Form.Item>
          {/* Visual split input */}
          <Form.Item label="货品编码" required>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={supplierCodePrefix ? `${supplierCodePrefix}.` : ''}
                disabled
                style={{ width: '40%', color: '#888', background: '#f5f5f5', cursor: 'not-allowed' }}
                placeholder="供应商编码"
              />
              <Input
                value={codeSeq}
                onChange={handleSeqChange}
                placeholder="如：01"
                disabled={codeLoading}
                suffix={codeLoading ? <span style={{ fontSize: 11, color: '#999' }}>加载中…</span> : null}
                style={{ width: '60%' }}
              />
            </Space.Compact>
          </Form.Item>

          <Form.Item name="name" label="货品名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：金钱树小型" />
          </Form.Item>
          <Form.Item name="category" label="品类">
            <Input placeholder="如：观叶植物" />
          </Form.Item>
          <Form.Item name="grade" label="等级">
            <Input placeholder="如：A级" />
          </Form.Item>
          <Form.Item name="unit" label="单位" initialValue="盆">
            <Input />
          </Form.Item>
          <Form.Item name="costPrice" label="进价">
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label="单价">
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="unitsPerPiece" label="每件数量" tooltip="每件包含多少盆/株，开单时用于计算件数">
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="如：30" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

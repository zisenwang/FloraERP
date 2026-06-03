import { useEffect, useState } from 'react'
import { Table, Button, Input, Modal, Form, App, Tag, Select, InputNumber } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  type Product, type ProductPayload,
} from '@/api/products'
import { getSuppliers, type Supplier } from '@/api/suppliers'
import { getErrorMessage } from '@/utils/error'
import styles from './SupplierList.module.css'

const CATEGORY_OPTIONS = ['观叶植物', '兰花', '观花植物', '多肉植物', '绿植', '其他']

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

  const fetchProducts = (kw?: string, supplierId?: number) => {
    setLoading(true)
    getProducts({ search: kw, supplier_id: supplierId })
      .then(setProducts)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchProducts()
    getSuppliers().then(setSuppliers).catch(() => {})
  }, [])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: Product) => {
    setEditing(record)
    form.setFieldsValue(record)
    setModalOpen(true)
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
    { title: '供应商', dataIndex: 'supplier_name', width: 100 },
    { title: '品类', dataIndex: 'category', width: 100 },
    { title: '单位', dataIndex: 'unit', width: 60 },
    { title: '单价', dataIndex: 'price', width: 80, render: (v: number) => `¥${v}` },
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
        <div style={{ display: 'flex', gap: 8 }}>
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
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="supplier_id" label="供应商" rules={[{ required: true, message: '请选择供应商' }]}>
            <Select
              placeholder="选择供应商"
              options={suppliers.map(s => ({ value: s.id, label: `${s.code} ${s.name}` }))}
            />
          </Form.Item>
          <Form.Item name="code" label="货品编码" rules={[{ required: true, message: '请输入编码' }]}>
            <Input placeholder="如：133.51" />
          </Form.Item>
          <Form.Item name="name" label="货品名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：金钱树小型" />
          </Form.Item>
          <Form.Item name="category" label="品类">
            <Select placeholder="选择品类" options={CATEGORY_OPTIONS.map(c => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item name="unit" label="单位" initialValue="盆">
            <Input />
          </Form.Item>
          <Form.Item name="price" label="单价">
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

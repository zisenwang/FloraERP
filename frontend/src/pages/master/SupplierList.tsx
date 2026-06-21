import { useEffect, useState } from 'react'
import { Table, Button, Input, Modal, Form, App, Tag } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier, getNextSupplierCode,
  type Supplier, type SupplierPayload,
} from '@/api/suppliers'
import { getErrorMessage } from '@/utils/error'
import styles from './SupplierList.module.css'

export default function SupplierList() {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<SupplierPayload>()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchSuppliers = (kw?: string) => {
    setLoading(true)
    getSuppliers(kw)
      .then(setSuppliers)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSuppliers() }, [])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    getNextSupplierCode().then(code => form.setFieldValue('code', code.padStart(3, '0'))).catch(() => {})
    setModalOpen(true)
  }

  const openEdit = (record: Supplier) => {
    setEditing(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then(values => {
      setSaving(true)
      const req = editing
        ? updateSupplier(editing.id, values)
        : createSupplier(values)

      req
        .then(() => {
          message.success(editing ? '更新成功' : '添加成功')
          setModalOpen(false)
          fetchSuppliers(search)
        })
        .catch(err => message.error(getErrorMessage(err)))
        .finally(() => setSaving(false))
    })
  }

  const handleDelete = (record: Supplier) => {
    modal.confirm({
      title: '确认删除',
      content: `删除供应商「${record.name}」？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () =>
        deleteSupplier(record.id)
          .then(() => {
            message.success('删除成功')
            fetchSuppliers(search)
          })
          .catch(err => message.error(getErrorMessage(err))),
    })
  }

  const columns: ColumnsType<Supplier> = [
    { title: '编码', dataIndex: 'code', width: 80 },
    { title: '名称', dataIndex: 'name', width: 160 },
    { title: '电话', dataIndex: 'phone', width: 140 },
    { title: '地址', dataIndex: 'address', width: 300 },
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
      <div className={styles.pageTitle}>供应商管理</div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="搜索编码或名称"
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={() => fetchSuppliers(search)}
            allowClear
            style={{ width: 220 }}
          />
          <Button icon={<SearchOutlined />} onClick={() => fetchSuppliers(search)}>搜索</Button>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增供应商</Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={suppliers}
        loading={loading}
        size="middle"
        scroll={{ x: 800 }}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
      />

      <Modal
        title={editing ? '编辑供应商' : '新增供应商'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="code" label="编码" rules={[{ required: true, message: '请输入编码' }]}>
            <Input placeholder="如：133" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：广阔" />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

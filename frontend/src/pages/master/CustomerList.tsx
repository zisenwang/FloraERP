import { useEffect, useState } from 'react'
import { Table, Button, Input, Modal, Form, App, Tag, Select } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  type Customer, type CustomerPayload,
} from '@/api/customers'
import { getErrorMessage } from '@/utils/error'
import styles from './SupplierList.module.css'

const LEVEL_OPTIONS = ['A', 'B', 'C']

export default function CustomerList() {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<CustomerPayload>()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchCustomers = (kw?: string) => {
    setLoading(true)
    getCustomers(kw)
      .then(setCustomers)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCustomers() }, [])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: Customer) => {
    setEditing(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then(values => {
      setSaving(true)
      const req = editing
        ? updateCustomer(editing.id, values)
        : createCustomer(values)

      req
        .then(() => {
          message.success(editing ? '更新成功' : '添加成功')
          setModalOpen(false)
          fetchCustomers(search)
        })
        .catch(err => message.error(getErrorMessage(err)))
        .finally(() => setSaving(false))
    })
  }

  const handleDelete = (record: Customer) => {
    modal.confirm({
      title: '确认删除',
      content: `删除客户「${record.name}」？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () =>
        deleteCustomer(record.id)
          .then(() => {
            message.success('删除成功')
            fetchCustomers(search)
          })
          .catch(err => message.error(getErrorMessage(err))),
    })
  }

  const columns: ColumnsType<Customer> = [
    { title: '编码', dataIndex: 'code', width: 80 },
    { title: '客户名称', dataIndex: 'name', width: 140 },
    { title: '联系人', dataIndex: 'contact', width: 100 },
    { title: '电话', dataIndex: 'phone', width: 140 },
    { title: '城市', dataIndex: 'city', width: 100 },
    {
      title: '等级', dataIndex: 'level', width: 80,
      render: (v: string) => {
        const color = v === 'A' ? 'gold' : v === 'B' ? 'blue' : 'default'
        return <Tag color={color}>{v}</Tag>
      },
    },
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
      <div className={styles.pageTitle}>客户管理</div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="搜索编码或名称"
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={() => fetchCustomers(search)}
            allowClear
            style={{ width: 220 }}
          />
          <Button icon={<SearchOutlined />} onClick={() => fetchCustomers(search)}>搜索</Button>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增客户</Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={customers}
        loading={loading}
        size="middle"
        scroll={{ x: 900 }}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
      />

      <Modal
        title={editing ? '编辑客户' : '新增客户'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="code" label="编码" rules={[{ required: true, message: '请输入编码' }]}>
            <Input placeholder="如：1300" />
          </Form.Item>
          <Form.Item name="name" label="客户名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：西安王蒙" />
          </Form.Item>
          <Form.Item name="contact" label="联系人">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
          <Form.Item name="city" label="城市">
            <Input placeholder="如：西安" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input />
          </Form.Item>
          <Form.Item name="level" label="等级">
            <Select placeholder="选择等级" options={LEVEL_OPTIONS.map(l => ({ value: l, label: l }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

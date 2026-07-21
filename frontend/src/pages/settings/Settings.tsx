import { useEffect, useState } from 'react'
import {
  Form, Input, Button, App, Divider, Spin, Tabs, Table, Tag, Modal, Select, Switch,
} from 'antd'
import { PlusOutlined, EditOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { updateSettings } from '@/api/settings'
import { listUsers, createUser, updateUser, changePassword, setUserPermissions, type UserRow } from '@/api/auth'
import { useSettings } from '@/store/SettingsContext'
import { useAuth } from '@/store/AuthContext'
import { getErrorMessage } from '@/utils/error'
import styles from './Settings.module.css'

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'operator', label: '操作员' },
]

const PERMISSION_OPTIONS = [
  { value: 'inventory_adjust', label: '库存调整' },
  { value: 'inventory_check', label: '库存盘点' },
  { value: 'payment',         label: '收支管理' },
  { value: 'loss',            label: '报损管理' },
]

// ─── Company Info Tab ────────────────────────────────────────────────────────

function CompanyTab() {
  const { message } = App.useApp()
  const { settings, reload } = useSettings()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (settings.company_name) {
      form.setFieldsValue({
        company_name: settings.company_name,
        company_address: settings.company_address,
        company_phone: settings.company_phone,
        print_title: settings.print_title,
      })
      setLoaded(true)
    }
  }, [settings, form])

  const handleSave = () => {
    form.validateFields().then(async (values) => {
      setSaving(true)
      try {
        await updateSettings(values)
        await reload()
        message.success('设置已保存')
      } catch (err) {
        message.error(getErrorMessage(err, '保存失败'))
      } finally {
        setSaving(false)
      }
    })
  }

  if (!loaded) return <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />

  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>公司信息</div>
      <Form form={form} layout="vertical" style={{ maxWidth: 480 }}>
        <Form.Item name="company_name" label="公司名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="company_address" label="公司地址">
          <Input />
        </Form.Item>
        <Form.Item name="company_phone" label="联系电话">
          <Input />
        </Form.Item>

        <Divider />
        <div className={styles.sectionTitle}>单据设置</div>

        <Form.Item name="print_title" label="打印抬头">
          <Input placeholder="显示在进货单/送货单顶部" />
        </Form.Item>

        <div className={styles.actions}>
          <Button type="primary" loading={saving} onClick={handleSave}>保存设置</Button>
        </div>
      </Form>
    </div>
  )
}

// ─── User Management Tab ─────────────────────────────────────────────────────

function UserTab() {
  const { message } = App.useApp()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [pwdTarget, setPwdTarget] = useState<UserRow | null>(null)
  const [permTarget, setPermTarget] = useState<UserRow | null>(null)
  const [permValues, setPermValues] = useState<string[]>([])
  const [permSaving, setPermSaving] = useState(false)

  const [addForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [pwdForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    listUsers()
      .then(setUsers)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Open edit modal
  useEffect(() => {
    if (editTarget) {
      editForm.setFieldsValue({
        username: editTarget.username,
        name: editTarget.name,
        role: editTarget.role,
        status: editTarget.status === 1,
      })
    }
  }, [editTarget, editForm])

  const handleAdd = () => {
    addForm.validateFields().then(async (values) => {
      setSubmitting(true)
      try {
        await createUser(values)
        message.success('用户已创建')
        setAddOpen(false)
        addForm.resetFields()
        load()
      } catch (err) {
        message.error(getErrorMessage(err, '创建失败'))
      } finally {
        setSubmitting(false)
      }
    })
  }

  const handleEdit = () => {
    editForm.validateFields().then(async (values) => {
      setSubmitting(true)
      try {
        await updateUser(editTarget!.id, { ...values, status: values.status ? 1 : 0 })
        message.success('用户已更新')
        setEditTarget(null)
        load()
      } catch (err) {
        message.error(getErrorMessage(err, '更新失败'))
      } finally {
        setSubmitting(false)
      }
    })
  }

  const openPerms = (record: UserRow) => {
    setPermTarget(record)
    setPermValues(record.permissions ?? [])
  }

  const handleSavePerms = async () => {
    if (!permTarget) return
    setPermSaving(true)
    try {
      await setUserPermissions(permTarget.id, permValues)
      message.success('权限已更新')
      setPermTarget(null)
      load()
    } catch (err) {
      message.error(getErrorMessage(err, '保存失败'))
    } finally {
      setPermSaving(false)
    }
  }

  const handleChangePwd = () => {
    pwdForm.validateFields().then(async (values) => {
      setSubmitting(true)
      try {
        const isSelf = pwdTarget!.id === currentUser?.id
        await changePassword(pwdTarget!.id, {
          oldPassword: isSelf ? values.oldPassword : undefined,
          newPassword: values.newPassword,
        })
        message.success('密码已修改')
        setPwdTarget(null)
        pwdForm.resetFields()
      } catch (err) {
        message.error(getErrorMessage(err, '修改失败'))
      } finally {
        setSubmitting(false)
      }
    })
  }

  const columns: ColumnsType<UserRow> = [
    { title: '用户名', dataIndex: 'username', width: 130 },
    { title: '姓名', dataIndex: 'name', width: 120 },
    {
      title: '角色', dataIndex: 'role', width: 100,
      render: (v: string) => v === 'admin' ? <Tag color="blue">管理员</Tag> : <Tag>操作员</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: number) => v === 1
        ? <Tag color="green">启用</Tag>
        : <Tag color="red">禁用</Tag>,
    },
    {
      title: '操作', key: 'action', width: 220,
      render: (_: unknown, record: UserRow) => (
        <span style={{ display: 'flex', gap: 8 }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => setEditTarget(record)}>编辑</Button>
          <Button size="small" icon={<LockOutlined />} onClick={() => { setPwdTarget(record); pwdForm.resetFields() }}>改密</Button>
          {record.role === 'operator' && (
            <Button size="small" icon={<SafetyOutlined />} onClick={() => openPerms(record)}>权限</Button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setAddOpen(true); addForm.resetFields() }}>
          新增用户
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={false}
        size="small"
        style={{ maxWidth: 680 }}
      />

      {/* Add User Modal */}
      <Modal
        title="新增用户"
        open={addOpen}
        onOk={handleAdd}
        onCancel={() => setAddOpen(false)}
        confirmLoading={submitting}
        okText="创建"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="初始密码" rules={[{ required: true }, { min: 4, message: '至少4位' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="operator" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title="编辑用户"
        open={!!editTarget}
        onOk={handleEdit}
        onCancel={() => setEditTarget(null)}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        title={`权限设置 — ${permTarget?.name ?? ''}`}
        open={!!permTarget}
        onOk={handleSavePerms}
        onCancel={() => setPermTarget(null)}
        confirmLoading={permSaving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>勾选后该操作员可访问对应模块：</div>
          {PERMISSION_OPTIONS.map(opt => (
            <div key={opt.value} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{opt.label}</span>
              <Switch
                checked={permValues.includes(opt.value)}
                onChange={checked => setPermValues(prev =>
                  checked ? [...prev, opt.value] : prev.filter(p => p !== opt.value)
                )}
              />
            </div>
          ))}
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title={`修改密码 — ${pwdTarget?.name ?? ''}`}
        open={!!pwdTarget}
        onOk={handleChangePwd}
        onCancel={() => { setPwdTarget(null); pwdForm.resetFields() }}
        confirmLoading={submitting}
        okText="确认修改"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical" style={{ marginTop: 16 }}>
          {pwdTarget?.id === currentUser?.id && (
            <Form.Item name="oldPassword" label="原密码" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true }, { min: 4, message: '至少4位' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                  return Promise.reject(new Error('两次密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function Settings() {
  return (
    <>
      <div className={styles.pageTitle}>系统设置</div>
      <Tabs
        items={[
          { key: 'company', label: '公司信息', children: <CompanyTab /> },
          { key: 'users',   label: '用户管理', children: <UserTab /> },
        ]}
      />
    </>
  )
}

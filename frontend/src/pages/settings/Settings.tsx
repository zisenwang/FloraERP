import { useState } from 'react'
import { Form, Input, Button, App, Divider } from 'antd'
import styles from './Settings.module.css'

const DEFAULT_SETTINGS = {
  company_name: '广阔园艺',
  company_address: '广州市荔湾区花博园宏星路中段广阔卉',
  company_phone: '13059146326，13903057717',
  print_title: '广阔园艺',
}

export default function Settings() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    form.validateFields().then(() => {
      setSaving(true)
      // TODO: persist to backend
      setTimeout(() => {
        message.success('设置已保存')
        setSaving(false)
      }, 400)
    })
  }

  return (
    <>
      <div className={styles.pageTitle}>系统设置</div>

      <div className={styles.card}>
        <div className={styles.sectionTitle}>公司信息</div>
        <Form form={form} layout="vertical" initialValues={DEFAULT_SETTINGS} style={{ maxWidth: 480 }}>
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
    </>
  )
}

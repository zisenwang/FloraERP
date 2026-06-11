import { useEffect, useState } from 'react'
import { Form, Input, Button, App, Divider, Spin } from 'antd'
import { updateSettings } from '@/api/settings'
import { useSettings } from '@/store/SettingsContext'
import { getErrorMessage } from '@/utils/error'
import styles from './Settings.module.css'

export default function Settings() {
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

  if (!loaded) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  return (
    <>
      <div className={styles.pageTitle}>系统设置</div>

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
    </>
  )
}

import { App, Form, Input, Button } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { login, type LoginPayload } from '@/api/auth'
import { useAuth } from '@/store/AuthContext'
import { getErrorMessage } from '@/utils/error'
import { useSettings } from '@/store/SettingsContext'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()
  const { settings } = useSettings()
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const handleSubmit = async (values: LoginPayload) => {
    try {
      const res = await login(values)
      setAuth(res.token, res.user)
      navigate('/')
    } catch (err: unknown) {
      message.error(getErrorMessage(err, '登录失败，请稍后重试'))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoText}>{settings.company_name} ERP</div>
          <div className={styles.subtitle}>花卉管理系统</div>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" size="large" block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}

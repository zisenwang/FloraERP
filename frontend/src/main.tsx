import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'dayjs/locale/zh-cn'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './store/AuthContext'
import { SettingsProvider } from './store/SettingsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#16a34a' } }}>
          <AntApp>
            <App />
          </AntApp>
        </ConfigProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>,
)

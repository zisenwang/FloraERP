import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Spin, App } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons'
import { useReactToPrint } from 'react-to-print'
import { getSalesReturn, type SalesReturn } from '@/api/sales'
import { getErrorMessage } from '@/utils/error'
import { useSettings } from '@/store/SettingsContext'
import { toChineseAmount } from '@/utils/chineseAmount'
import styles from './SalesOrderView.module.css'

export default function SalesReturnView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const printRef = useRef<HTMLDivElement>(null)
  const { settings } = useSettings()
  const [ret, setRet] = useState<SalesReturn | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSalesReturn(Number(id))
      .then(setRet)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  const handlePrint = useReactToPrint({ contentRef: printRef })

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
  if (!ret) return null

  const items = ret.items ?? []
  const totalQty = items.reduce((s, i) => s + i.qty, 0)
  const totalPieces = items.reduce((s, i) => s + (i.pieces || 0), 0)

  return (
    <div className={styles.page}>
      <div className={styles.actions}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/sales/orders')}>返回</Button>
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint()}>打印退销单</Button>
      </div>

      <div ref={printRef} className={styles.printArea}>
        <div className={styles.printHeader}>
          <img src="/logo.png" alt="logo" className={styles.printLogo} />
          <div className={styles.printHeaderCenter}>
            <div className={styles.printTitle}>{settings.print_title}退销单</div>
            <div className={styles.printSubtitle}>
              <div>地址：{settings.company_address}</div>
              <div>电话：{settings.company_phone}</div>
            </div>
          </div>
          <div />
        </div>

        <div className={styles.printMeta}>
          <span>
            客户：{ret.customerCode} <span className={styles.printCustomerName}>{ret.customerName}</span>
            {ret.customerPhone && <><br />{ret.customerPhone}</>}
            {ret.customerAddress && <><br />地址：{ret.customerAddress}</>}
          </span>
          <span style={{ alignSelf: 'flex-end' }}>日期：{ret.returnDate}&emsp;单号：{ret.returnNo}</span>
        </div>

        <table className={styles.printTable}>
          <thead>
            <tr>
              <th>供应商</th>
              <th>编码</th>
              <th>货品名称</th>
              <th>单位</th>
              <th>数量</th>
              <th>单价</th>
              <th>金额</th>
              <th>件数</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.supplierCode}</td>
                <td>{item.productCode}</td>
                <td>{item.productName}</td>
                <td className={styles.center}>{item.unit}</td>
                <td className={styles.center}>{item.qty}</td>
                <td className={styles.right}>¥{item.unitPrice}</td>
                <td className={styles.right}>¥{item.amount.toFixed(2)}</td>
                <td className={styles.center}>{item.pieces || '—'}</td>
                <td>{item.notes || ''}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>小计</td>
              <td className={styles.center}><strong>{totalQty}</strong></td>
              <td></td>
              <td className={styles.right}><strong>¥{ret.totalAmount.toFixed(2)}</strong></td>
              <td className={styles.center}><strong>{totalPieces || '—'}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div className={styles.printSummary}>
          合计数量 &nbsp;<strong>{totalQty}</strong>&emsp;
          合计件数 &nbsp;<strong>{totalPieces || '—'}</strong>&emsp;
          人民币：小写 &nbsp;<strong>¥{ret.totalAmount.toFixed(2)}</strong>&emsp;
          大写 &nbsp;<strong>{toChineseAmount(ret.totalAmount)}</strong>
          {ret.notes && <><br /><span className={styles.printNotes}>备注：{ret.notes}</span></>}
        </div>

        <div className={styles.printFooter}>
          <span>开单人：___________</span>
          <span>经手人：___________</span>
          <span>复核：___________</span>
          <span>第1页/共1页</span>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Spin, App } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons'
import { useReactToPrint } from 'react-to-print'
import { getSalesOrder, type SalesOrder } from '@/api/sales'
import { getErrorMessage } from '@/utils/error'
import styles from './SalesOrderView.module.css'
import { useSettings } from '@/store/SettingsContext'


export default function SalesOrderView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const printRef = useRef<HTMLDivElement>(null)

  const { settings } = useSettings()
  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSalesOrder(Number(id))
      .then(setOrder)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  const handlePrint = useReactToPrint({ contentRef: printRef })

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
  if (!order) return null

  const totalQty = order.items.reduce((s, i) => s + i.qty, 0)
  const totalPieces = order.items.reduce((s, i) => s + (i.pieces || 0), 0)

  return (
    <div className={styles.page}>
      <div className={styles.actions}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/sales/orders')}>返回</Button>
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint()}>打印送货单</Button>
      </div>

      <div ref={printRef} className={styles.printArea}>
        <div className={styles.printHeader}>
          <img src="/logo.png" alt="logo" className={styles.printLogo} />
          <div className={styles.printHeaderCenter}>
            <div className={styles.printTitle}>{settings.print_title}送货单</div>
            <div className={styles.printSubtitle}>
              地址：{settings.company_address}&emsp;电话：{settings.company_phone}
            </div>
          </div>
          <div />
        </div>

        <div className={styles.printMeta}>
          <span>
            客户：{order.customerCode} <span className={styles.printCustomerName}>{order.customerName}</span>
            {order.customerPhone && <><br />{order.customerPhone}</>}
            {order.customerAddress && <><br />地址：{order.customerAddress}</>}
          </span>
          <span style={{ alignSelf: 'flex-end' }}>日期：{order.orderDate}&emsp;单号：{order.orderNo}</span>
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
            {order.items.map((item, i) => {
              const finalAmt = item.finalAmount ?? +(item.amount * (item.discount ?? 100) / 100).toFixed(2)
              return (
                <tr key={i}>
                  <td>{item.supplierCode}</td>
                  <td>{item.productCode}</td>
                  <td>{item.productName}</td>
                  <td className={styles.center}>{item.unit}</td>
                  <td className={styles.center}>{item.qty}</td>
                  <td className={styles.right}>¥{item.unitPrice}</td>
                  <td className={styles.right}>¥{finalAmt.toFixed(2)}</td>
                  <td className={styles.center}>{item.pieces}</td>
                  <td>{item.notes || ''}</td>
                </tr>
              )
            })}
            <tr>
              <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>小计</td>
              <td className={styles.center}><strong>{totalQty}</strong></td>
              <td></td>
              <td className={styles.right}><strong>¥{order.totalAmount.toFixed(2)}</strong></td>
              <td className={styles.center}><strong>{totalPieces}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {order.notes && (
          <div className={styles.printSummary}>
            <span className={styles.printNotes}>备注：{order.notes}</span>
          </div>
        )}

        <div className={styles.printFooter}>
          <span>开单人：___________</span>
          <span>收货人：___________</span>
          <span>复核：___________</span>
          <span>第1页/共1页</span>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Spin, App } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons'
import { useReactToPrint } from 'react-to-print'
import { getPurchaseOrder, type PurchaseOrder } from '@/api/purchase'
import { getErrorMessage } from '@/utils/error'
import styles from './PurchaseOrderView.module.css'

const COMPANY_NAME = '广阔园艺'
const COMPANY_ADDRESS = '广州市荔湾区花博园宏星路中段广阔卉'
const COMPANY_PHONE = '13059146326，13903057717'

export default function PurchaseOrderView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const printRef = useRef<HTMLDivElement>(null)

  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPurchaseOrder(Number(id))
      .then(setOrder)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  const handlePrint = useReactToPrint({ contentRef: printRef })

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
  if (!order) return null

  const totalQty = order.items.reduce((s, i) => s + i.qty, 0)

  return (
    <div className={styles.page}>
      <div className={styles.actions}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/purchase/orders')}>返回</Button>
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint()}>打印进货单</Button>
      </div>

      <div ref={printRef} className={styles.printArea}>
        <div className={styles.printTitle}>{COMPANY_NAME}进货单</div>
        <div className={styles.printSubtitle}>
          地址：{COMPANY_ADDRESS}&emsp;电话：{COMPANY_PHONE}
        </div>

        <div className={styles.printMeta}>
          <span>供应商：{order.supplierName}</span>
          <span>日期：{order.orderDate}&emsp;单号：{order.orderNo}</span>
        </div>

        <table className={styles.printTable}>
          <thead>
            <tr>
              <th>编码</th>
              <th>货品名称</th>
              <th>单位</th>
              <th>数量</th>
              <th>单价</th>
              <th>金额</th>
              <th>折扣</th>
              <th>折后金额</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => {
              const discount = item.discount ?? 100
              const finalAmt = item.finalAmount ?? +(item.amount * discount / 100).toFixed(2)
              return (
                <tr key={i}>
                  <td>{item.productCode}</td>
                  <td>{item.productName}</td>
                  <td className={styles.center}>盆</td>
                  <td className={styles.center}>{item.qty}</td>
                  <td className={styles.right}>¥{item.unitPrice}</td>
                  <td className={styles.right}>¥{item.amount.toFixed(2)}</td>
                  <td className={styles.right}>{discount}%</td>
                  <td className={styles.right}>¥{finalAmt.toFixed(2)}</td>
                  <td></td>
                </tr>
              )
            })}
            <tr>
              <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>小计</td>
              <td className={styles.right}><strong>{totalQty}</strong></td>
              <td></td>
              <td className={styles.right}><strong>¥{order.totalAmount.toFixed(2)}</strong></td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>

        <div className={styles.printSummary}>
          人民币：合计 &nbsp;<strong>{totalQty}</strong>&nbsp; 盆&emsp;
          小写 &nbsp;<strong>¥{order.totalAmount.toFixed(2)}</strong>
        </div>

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

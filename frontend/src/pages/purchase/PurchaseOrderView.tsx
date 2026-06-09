import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Spin, App } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons'
import { useReactToPrint } from 'react-to-print'
import { getPurchaseOrder, type PurchaseOrder } from '@/api/purchase'
import { getErrorMessage } from '@/utils/error'
import styles from './PurchaseOrderView.module.css'

import { COMPANY_NAME, COMPANY_ADDRESS, COMPANY_PHONE } from '@/constants/company'

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

  const items = order.items ?? []
  const totalQty = items.reduce((s, i) => s + i.qty, 0)

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
          <colgroup>
            <col style={{ width: '9%' }} />   {/* 编码 */}
            <col style={{ width: '18%' }} />  {/* 货品名称 */}
            <col style={{ width: '9%' }} />   {/* 品类 */}
            <col style={{ width: '6%' }} />   {/* 等级 */}
            <col style={{ width: '5%' }} />   {/* 单位 */}
            <col style={{ width: '6%' }} />   {/* 数量 */}
            <col style={{ width: '9%' }} />   {/* 单价 */}
            <col style={{ width: '10%' }} />  {/* 金额 */}
            <col style={{ width: '6%' }} />   {/* 折扣 */}
            <col style={{ width: '11%' }} />  {/* 折后金额 */}
            <col style={{ width: '11%' }} />  {/* 备注 */}
          </colgroup>
          <thead>
            <tr>
              <th>编码</th>
              <th>货品名称</th>
              <th>品类</th>
              <th>等级</th>
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
            {items.map((item, i) => {
              const discount = item.discount ?? 100
              const finalAmt = item.finalAmount ?? +(item.amount * discount / 100).toFixed(2)
              return (
                <tr key={i}>
                  <td>{item.productCode}</td>
                  <td>{item.productName}</td>
                  <td>{item.category ?? '—'}</td>
                  <td>{item.grade ?? '—'}</td>
                  <td>{item.unit}</td>
                  <td>{item.qty}</td>
                  <td>¥{item.unitPrice}</td>
                  <td>¥{item.amount.toFixed(2)}</td>
                  <td>{discount}%</td>
                  <td>¥{finalAmt.toFixed(2)}</td>
                  <td>{item.notes || ''}</td>
                </tr>
              )
            })}
            <tr>
              <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600 }}>小计</td>
              <td><strong>{totalQty}</strong></td>
              <td></td>
              <td><strong>¥{order.totalAmount.toFixed(2)}</strong></td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>

        <div className={styles.printSummary}>
          人民币：合计 &nbsp;<strong>{totalQty}</strong>&nbsp; 盆&emsp;
          小写 &nbsp;<strong>¥{order.totalAmount.toFixed(2)}</strong>
          {order.notes && <><br />备注：{order.notes}</>}
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

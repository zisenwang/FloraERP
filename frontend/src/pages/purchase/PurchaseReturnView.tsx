import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Spin, App, Popconfirm } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined, StopOutlined } from '@ant-design/icons'
import { useReactToPrint } from 'react-to-print'
import { getPurchaseReturn, voidPurchaseReturn, type PurchaseReturn } from '@/api/purchase'
import { getErrorMessage } from '@/utils/error'
import { useSettings } from '@/store/SettingsContext'
import { toChineseAmount } from '@/utils/chineseAmount'
import styles from './PurchaseOrderView.module.css'

export default function PurchaseReturnView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const printRef = useRef<HTMLDivElement>(null)
  const { settings } = useSettings()
  const [ret, setRet] = useState<PurchaseReturn | null>(null)
  const [loading, setLoading] = useState(true)
  const [voiding, setVoiding] = useState(false)

  useEffect(() => {
    getPurchaseReturn(Number(id))
      .then(setRet)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  const handleVoid = async () => {
    setVoiding(true)
    try {
      await voidPurchaseReturn(Number(id))
      message.success('已作废')
      navigate('/purchase/orders')
    } catch (err) {
      message.error(getErrorMessage(err))
    } finally {
      setVoiding(false)
    }
  }

  const handlePrint = useReactToPrint({ contentRef: printRef })

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
  if (!ret) return null

  const items = ret.items ?? []
  const totalQty = items.reduce((s, i) => s + i.qty, 0)
  const totalPieces = items.reduce((s, i) => s + (i.pieces || 0), 0)

  return (
    <div className={styles.page}>
      <div className={styles.actions}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/purchase/orders')}>返回</Button>
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint()}>打印退货单</Button>
        {!ret.notes?.startsWith('作废_') && (
          <Popconfirm
            title="作废此单据？"
            description="作废后数量归零，单据保留，此操作不可撤销"
            okText="确认作废"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={handleVoid}
          >
            <Button danger icon={<StopOutlined />} loading={voiding}>作废此单</Button>
          </Popconfirm>
        )}
      </div>

      <div ref={printRef} className={styles.printArea}>
        <div className={styles.printHeader}>
          <img src="/logo.png" alt="logo" className={styles.printLogo} />
          <div className={styles.printHeaderCenter}>
            <div className={styles.printTitle}>{settings.print_title}退货单</div>
            <div className={styles.printSubtitle}>
              <div>地址：{settings.company_address}</div>
              <div>电话：{settings.company_phone}</div>
            </div>
          </div>
          <div />
        </div>

        <div className={styles.printMeta}>
          <span>供应商：{ret.supplierCode} {ret.supplierName}</span>
          <span>日期：{ret.returnDate}&emsp;单号：{ret.returnNo}</span>
        </div>

        <table className={styles.printTable}>
          <colgroup>
            <col style={{ width: '9%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>编码</th>
              <th>货品名称</th>
              <th>品类</th>
              <th>等级</th>
              <th>单位</th>
              <th>数量</th>
              <th>件数</th>
              <th>单价</th>
              <th>金额</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.productCode}</td>
                <td>{item.productName}</td>
                <td>{item.category ?? '—'}</td>
                <td>{item.grade ?? '—'}</td>
                <td>{item.unit}</td>
                <td>{item.qty}</td>
                <td>{item.pieces || '—'}</td>
                <td>¥{item.unitPrice}</td>
                <td>¥{item.amount.toFixed(2)}</td>
                <td>{item.notes || ''}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600 }}>小计</td>
              <td><strong>{totalQty}</strong></td>
              <td><strong>{totalPieces || '—'}</strong></td>
              <td></td>
              <td><strong>¥{ret.totalAmount.toFixed(2)}</strong></td>
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

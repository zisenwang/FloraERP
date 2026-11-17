import { useEffect, useRef, useState } from 'react'
import { Modal, Spin, App, Button, Descriptions, Table, Tag } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { useReactToPrint } from 'react-to-print'
import type { ColumnsType } from 'antd/es/table'
import { getPurchaseOrder, type PurchaseOrder, type PurchaseOrderItem } from '@/api/purchase'
import { useSettings } from '@/store/SettingsContext'
import { toChineseAmount } from '@/utils/chineseAmount'
import { getErrorMessage } from '@/utils/error'
import styles from './OrderPrint.module.css'

interface Props {
  orderId: number | null
  onClose: () => void
}

const itemColumns: ColumnsType<PurchaseOrderItem> = [
  { title: '编码', dataIndex: 'productCode', width: 80 },
  { title: '货品名称', dataIndex: 'productName', width: 140 },
  { title: '品类', dataIndex: 'category', width: 70, render: (v: string | null) => v || '—' },
  { title: '等级', dataIndex: 'grade', width: 60, render: (v: string | null) => v || '—' },
  { title: '单位', dataIndex: 'unit', width: 55, align: 'center' },
  { title: '数量', dataIndex: 'qty', width: 60, align: 'center' },
  { title: '件数', dataIndex: 'pieces', width: 60, align: 'center', render: (v: number) => v || '—' },
  { title: '单价', dataIndex: 'unitPrice', width: 80, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
  { title: '金额', dataIndex: 'amount', width: 85, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
  { title: '折扣', dataIndex: 'discount', width: 60, align: 'center', render: (v: number) => `${v}%` },
  {
    title: '折后金额', dataIndex: 'finalAmount', width: 90, align: 'right',
    render: (v: number) => <span style={{ color: '#389e0d' }}>¥{v.toFixed(2)}</span>,
  },
]

export default function PurchaseOrderModal({ orderId, onClose }: Props) {
  const { message } = App.useApp()
  const { settings } = useSettings()
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: printRef })

  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (orderId == null) { setOrder(null); return }
    setLoading(true)
    setOrder(null)
    getPurchaseOrder(orderId)
      .then(setOrder)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [orderId])

  const open = orderId !== null
  const items = order?.items ?? []
  const totalQty = items.reduce((s, i) => s + i.qty, 0)
  const totalPieces = items.reduce((s, i) => s + (i.pieces || 0), 0)

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ paddingRight: '30pt' }}>{order ? `进货单 ${order.orderNo}` : '进货单详情'}</span>
          {order && <Button type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint()}>打印进货单</Button>}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={940}
      destroyOnClose
    >
      {loading && <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />}

      {order && (
        <>
          {/* ── On-screen summary ── */}
          <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="单号">{order.orderNo}</Descriptions.Item>
            <Descriptions.Item label="日期">{order.orderDate}</Descriptions.Item>
            <Descriptions.Item label="供应商">{order.supplierCode} {order.supplierName}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={order.status === '已入库' ? 'green' : 'default'}>{order.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="总金额">¥{order.totalAmount.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="折后金额">
              <span style={{ color: '#389e0d', fontWeight: 600 }}>¥{order.finalAmount.toFixed(2)}</span>
            </Descriptions.Item>
            {order.notes && (
              <Descriptions.Item label="备注" span={2}>{order.notes}</Descriptions.Item>
            )}
          </Descriptions>

          <Table
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 820 }}
            dataSource={items}
            columns={itemColumns}
          />

          {/* ── Hidden print template ── */}
          <div style={{ display: 'none' }}>
            <div ref={printRef} className={styles.printArea}>
              <div className={styles.printTitle}>{settings.print_title}进货单</div>
              <div className={styles.printSubtitle}>
                地址：{settings.company_address}&emsp;电话：{settings.company_phone}
              </div>
              <div className={styles.printMeta}>
                <span>供应商：{order.supplierCode} {order.supplierName}</span>
                <span>日期：{order.orderDate}&emsp;单号：{order.orderNo}</span>
              </div>
              <table className={styles.printTable}>
                <colgroup>
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '13%' }} />
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
                        <td className={styles.left}>{item.productName}</td>
                        <td>{item.category ?? '—'}</td>
                        <td>{item.grade ?? '—'}</td>
                        <td>{item.unit}</td>
                        <td>{item.qty}</td>
                        <td>{item.pieces || '—'}</td>
                        <td className={styles.right}>¥{item.unitPrice}</td>
                        <td className={styles.right}>¥{item.amount.toFixed(2)}</td>
                        <td>{discount}%</td>
                        <td className={styles.right}>¥{finalAmt.toFixed(2)}</td>
                        <td className={styles.left}>{item.notes || ''}</td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600 }}>小计</td>
                    <td><strong>{totalQty}</strong></td>
                    <td><strong>{totalPieces || '—'}</strong></td>
                    <td></td>
                    <td className={styles.right}><strong>¥{order.totalAmount.toFixed(2)}</strong></td>
                    <td colSpan={3}></td>
                  </tr>
                </tbody>
              </table>
              <div className={styles.printSummary}>
                合计数量 &nbsp;<strong>{totalQty}</strong>&emsp;
                合计件数 &nbsp;<strong>{totalPieces || '—'}</strong>&emsp;
                人民币：小写 &nbsp;<strong>¥{order.totalAmount.toFixed(2)}</strong>&emsp;
                大写 &nbsp;<strong>{toChineseAmount(order.totalAmount)}</strong>
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
        </>
      )}
    </Modal>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Modal, Spin, App, Button, Descriptions, Table, Tag } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { useReactToPrint } from 'react-to-print'
import type { ColumnsType } from 'antd/es/table'
import { getSalesOrder, type SalesOrder, type SalesOrderItem } from '@/api/sales'
import { useSettings } from '@/store/SettingsContext'
import { getErrorMessage } from '@/utils/error'
import printStyles from '../pages/sales/SalesOrderView.module.css'

interface Props {
  orderId: number | null
  onClose: () => void
}

const itemColumns: ColumnsType<SalesOrderItem> = [
  { title: '供应商', dataIndex: 'supplierCode', width: 70 },
  { title: '编码', dataIndex: 'productCode', width: 80 },
  { title: '货品名称', dataIndex: 'productName', width: 140 },
  { title: '单位', dataIndex: 'unit', width: 55, align: 'center' },
  { title: '数量', dataIndex: 'qty', width: 60, align: 'center' },
  { title: '单价', dataIndex: 'unitPrice', width: 80, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
  { title: '折扣', dataIndex: 'discount', width: 60, align: 'center', render: (v: number) => `${v}%` },
  { title: '折后金额', dataIndex: 'finalAmount', width: 90, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
  { title: '件数', dataIndex: 'pieces', width: 60, align: 'center', render: (v: number) => v || '—' },
  {
    title: '利润', width: 90, align: 'right',
    render: (_: unknown, r: SalesOrderItem) => {
      const profit = r.finalAmount - (r.costPrice ?? 0) * r.qty
      return (
        <span style={{ color: profit >= 0 ? '#389e0d' : '#cf1322', fontWeight: 500 }}>
          {profit >= 0 ? '+' : ''}¥{profit.toFixed(2)}
        </span>
      )
    },
  },
]

export default function SalesOrderModal({ orderId, onClose }: Props) {
  const { message } = App.useApp()
  const { settings } = useSettings()
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: printRef })

  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (orderId == null) { setOrder(null); return }
    setLoading(true)
    setOrder(null)
    getSalesOrder(orderId)
      .then(setOrder)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [orderId])

  const open = orderId !== null
  const totalQty = order?.items.reduce((s, i) => s + i.qty, 0) ?? 0
  const totalPieces = order?.items.reduce((s, i) => s + (i.pieces || 0), 0) ?? 0

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ paddingRight: '30pt'}}>{order ? `销售单 ${order.orderNo}` : '销售单详情'}</span>
          {order && <Button type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint()}>打印送货单</Button>}
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
            <Descriptions.Item label="客户">{order.customerCode} {order.customerName}</Descriptions.Item>
            <Descriptions.Item label="收款状态">
              <Tag color={order.paymentStatus === '已收款' ? 'green' : order.paymentStatus === '部分收款' ? 'orange' : 'red'}>
                {order.paymentStatus}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="总金额">¥{(order.totalAmount ?? 0).toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="毛利">
              {(() => {
                const profit = order.totalProfit ?? 0
                return (
                  <span style={{ color: profit >= 0 ? '#389e0d' : '#cf1322', fontWeight: 600 }}>
                    {profit >= 0 ? '+' : ''}¥{profit.toFixed(2)}
                  </span>
                )
              })()}
            </Descriptions.Item>
            {order.notes && (
              <Descriptions.Item label="备注" span={2}>{order.notes}</Descriptions.Item>
            )}
          </Descriptions>

          <Table
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 780 }}
            dataSource={order.items}
            columns={itemColumns}
          />

          {/* ── Hidden print template (identical to SalesOrderView) ── */}
          <div style={{ display: 'none' }}>
            <div ref={printRef} className={printStyles.printArea}>
              <div className={printStyles.printHeader}>
                <img src="/logo.png" alt="logo" className={printStyles.printLogo} />
                <div className={printStyles.printHeaderCenter}>
                  <div className={printStyles.printTitle}>{settings.print_title}送货单</div>
                  <div className={printStyles.printSubtitle}>
                    <div>地址：{settings.company_address}</div>
                    <div>电话：{settings.company_phone}</div>
                  </div>
                </div>
                <div />
              </div>

              <div className={printStyles.printMeta}>
                <span>
                  客户：{order.customerCode} <span className={printStyles.printCustomerName}>{order.customerName}</span>
                  {order.customerPhone && <><br />{order.customerPhone}</>}
                  {order.customerAddress && <><br />地址：{order.customerAddress}</>}
                </span>
                <span style={{ alignSelf: 'flex-end' }}>日期：{order.orderDate}&emsp;单号：{order.orderNo}</span>
              </div>

              <table className={printStyles.printTable}>
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
                        <td className={printStyles.center}>{item.unit}</td>
                        <td className={printStyles.center}>{item.qty}</td>
                        <td className={printStyles.right}>¥{item.unitPrice}</td>
                        <td className={printStyles.right}>¥{finalAmt.toFixed(2)}</td>
                        <td className={printStyles.center}>{item.pieces}</td>
                        <td>{item.notes || ''}</td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>小计</td>
                    <td className={printStyles.center}><strong>{totalQty}</strong></td>
                    <td></td>
                    <td className={printStyles.right}><strong>¥{(order.totalAmount ?? 0).toFixed(2)}</strong></td>
                    <td className={printStyles.center}><strong>{totalPieces}</strong></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              {order.notes && (
                <div className={printStyles.printSummary}>
                  <span className={printStyles.printNotes}>备注：{order.notes}</span>
                </div>
              )}

              <div className={printStyles.printFooter}>
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

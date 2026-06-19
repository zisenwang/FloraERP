import { useEffect, useRef, useState } from 'react'
import { Drawer, Spin, App, Button, Descriptions, Table, Tag } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { useReactToPrint } from 'react-to-print'
import type { ColumnsType } from 'antd/es/table'
import { getSalesOrder, type SalesOrder, type SalesOrderItem } from '@/api/sales'
import { useSettings } from '@/store/SettingsContext'
import { toChineseAmount } from '@/utils/chineseAmount'
import { getErrorMessage } from '@/utils/error'
import styles from './OrderPrint.module.css'

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
  { title: '件数', dataIndex: 'pieces', width: 60, align: 'center', render: (v: number) => v || '—' },
  { title: '单价', dataIndex: 'unitPrice', width: 80, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
  { title: '折扣', dataIndex: 'discount', width: 60, align: 'center', render: (v: number) => `${v}%` },
  { title: '折后金额', dataIndex: 'finalAmount', width: 90, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
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

export default function SalesOrderDrawer({ orderId, onClose }: Props) {
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
    <Drawer
      title={order ? `销售单 ${order.orderNo}` : '销售单详情'}
      open={open}
      onClose={onClose}
      width={860}
      extra={
        order && (
          <Button type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint()}>
            打印送货单
          </Button>
        )
      }
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

          {/* ── Hidden print template ── */}
          <div style={{ display: 'none' }}>
            <div ref={printRef} className={styles.printArea}>
              <div className={styles.printTitle}>{settings.print_title}送货单</div>
              <div className={styles.printSubtitle}>
                地址：{settings.company_address}&emsp;电话：{settings.company_phone}
              </div>
              <div className={styles.printMeta}>
                <span>
                  客户：{order.customerCode} {order.customerName}
                  {order.customerPhone && <>&emsp;{order.customerPhone}</>}
                  {order.customerAddress && <><br />地址：{order.customerAddress}</>}
                </span>
                <span>日期：{order.orderDate}&emsp;单号：{order.orderNo}</span>
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
                        <td className={styles.left}>{item.productName}</td>
                        <td>{item.unit}</td>
                        <td>{item.qty}</td>
                        <td className={styles.right}>¥{item.unitPrice}</td>
                        <td className={styles.right}>¥{finalAmt.toFixed(2)}</td>
                        <td>{item.pieces}</td>
                        <td className={styles.left}>{item.notes || ''}</td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>小计</td>
                    <td><strong>{totalQty}</strong></td>
                    <td></td>
                    <td className={styles.right}><strong>¥{(order.totalAmount ?? 0).toFixed(2)}</strong></td>
                    <td><strong>{totalPieces}</strong></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
              <div className={styles.printSummary}>
                合计数量 &nbsp;<strong>{totalQty}</strong>&emsp;
                人民币：小写 &nbsp;<strong>¥{(order.totalAmount ?? 0).toFixed(2)}</strong>&emsp;
                大写 &nbsp;<strong>{toChineseAmount(order.totalAmount ?? 0)}</strong>
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
    </Drawer>
  )
}

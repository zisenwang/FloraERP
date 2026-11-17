import { useEffect, useState } from 'react'
import { Table, App, Button, Tag } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import {
  getPurchaseOrderRows,
  type ReportGroupRow, type ReportOrderRow,
} from '@/api/reports'
import { exportPurchaseExcel } from '@/utils/exportExcel'
import type { PurchaseDim } from './PurchaseReport'
import { C_AMOUNT } from '@/constants/colors'

interface Props {
  selectedL1: ReportGroupRow
  startDate: string
  endDate: string
  groupBy: PurchaseDim
  onBack: () => void
  onOpenDrawer: (orderId: number) => void
}

export default function PurchaseReportDetail({
  selectedL1, startDate, endDate, groupBy, onBack, onOpenDrawer,
}: Props) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [rows, setRows] = useState<ReportOrderRow[]>([])
  const [loading, setLoading] = useState(false)

  const l1Label = groupBy === 'supplier' ? '供应商' : '货品'

  useEffect(() => {
    setLoading(true)
    const params: Parameters<typeof getPurchaseOrderRows>[0] = { startDate, endDate }
    if (groupBy === 'supplier') params.supplierId = selectedL1.id
    else params.productId = selectedL1.id
    getPurchaseOrderRows(params)
      .then(setRows)
      .catch(() => message.error('加载详情失败'))
      .finally(() => setLoading(false))
  }, [selectedL1.id, startDate, endDate, groupBy])

  const columns: ColumnsType<ReportOrderRow> = [
    { title: '日期',     dataIndex: 'orderDate',    width: 100, align: 'center' },
    { title: '供应商',   dataIndex: 'supplierCode', width: 70,  align: 'center' },
    {
      title: '单号', dataIndex: 'orderNo', width: 160, align: 'center',
      render: (v: string, r) => (
        <span>
          {r.isReturn ? <Tag color="orange" style={{ marginRight: 4 }}>退</Tag> : null}
          {v}
        </span>
      ),
    },
    { title: '产品编码', dataIndex: 'productCode',  width: 90,  align: 'center' },
    { title: '产品名称', dataIndex: 'productName',  width: 130, align: 'center' },
    { title: '单位',     dataIndex: 'unit',         width: 55,  align: 'center', render: (v: string | null) => v ?? '—' },
    { title: '数量',     dataIndex: 'qty',          width: 65,  align: 'center' },
    { title: '单价',     dataIndex: 'unitPrice',    width: 80,  align: 'right',  render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '金额', dataIndex: 'finalAmount', width: 100, align: 'right',
      render: (v: number, r) => (
        <span style={{ color: r.isReturn ? '#cf1322' : C_AMOUNT, fontWeight: 600 }}>
          {r.isReturn ? '-' : ''}¥{v.toFixed(2)}
        </span>
      ),
    },
    { title: '件数',   dataIndex: 'pieces',   width: 60,  align: 'center', render: (v: number) => v || '—' },
    { title: '经办人', dataIndex: 'operator', width: 60,  align: 'center', render: (v: string | null) => v ?? '—' },
    { title: '备注',   dataIndex: 'notes',    width: 100, align: 'center', render: (v: string | null) => v ?? '—' },
    {
      title: '操作', width: 60, align: 'center', fixed: 'right',
      render: (_, r) => (
        <Button size="small" type="link"
          onClick={() => r.isReturn ? navigate(`/purchase/returns/${r.orderId}`) : onOpenDrawer(r.orderId)}>
          查看
        </Button>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回汇总</Button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>
          {l1Label}：{selectedL1.name}
        </span>
        <span style={{ color: '#888', fontSize: 13 }}>{startDate} ~ {endDate}</span>
        <Button icon={<DownloadOutlined />} onClick={() => exportPurchaseExcel(rows, startDate, endDate, selectedL1.name)}>
          导出Excel
        </Button>
      </div>


      <Table
        rowKey={(r, i) => `${r.orderNo}-${i}`}
        size="small"
        dataSource={rows}
        columns={columns}
        loading={loading}
        pagination={false}
        scroll={{ x: 1030 }}
        summary={pageData => {
          const totalQty    = pageData.reduce((s, r) => s + (r.qty ?? 0), 0)
          const totalAmount = pageData.reduce((s, r) => s + (r.finalAmount ?? 0), 0)
          const totalPieces = pageData.reduce((s, r) => s + (r.pieces ?? 0), 0)
          return (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ fontWeight: 600, background: '#f0f5ff' }}>
                <Table.Summary.Cell index={0} colSpan={6} align="right">合计</Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="center">{totalQty}</Table.Summary.Cell>
                <Table.Summary.Cell index={7} />
                <Table.Summary.Cell index={8} align="center">
                  <span style={{ color: C_AMOUNT }}>¥{totalAmount.toFixed(2)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={9} align="center">{totalPieces || '—'}</Table.Summary.Cell>
                <Table.Summary.Cell index={10} />
                <Table.Summary.Cell index={11} />
                <Table.Summary.Cell index={12} />
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />
    </>
  )
}

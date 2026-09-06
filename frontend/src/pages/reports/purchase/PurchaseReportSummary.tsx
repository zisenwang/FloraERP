import { useEffect, useState } from 'react'
import { Table, DatePicker, Radio, App, Button, Input } from 'antd'
import { EyeOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import {
  getPurchaseGroup,
  type ReportGroupRow,
} from '@/api/reports'
import { getErrorMessage } from '@/utils/error'
import { exportPurchaseGroupExcel } from '@/utils/exportExcel'
import { C_AMOUNT, C_LABEL } from '@/constants/colors'
import type { PurchaseDim } from './PurchaseReport'
import styles from '../Reports.module.css'

interface Props {
  dateRange: [Dayjs, Dayjs]
  onDateChange: (range: [Dayjs, Dayjs]) => void
  groupBy: PurchaseDim
  onGroupByChange: (by: PurchaseDim) => void
  startDate: string
  endDate: string
  onSelectL1: (row: ReportGroupRow) => void
  onOpenDrawer: (orderId: number) => void
}

export default function PurchaseReportSummary({
  dateRange, onDateChange, groupBy, onGroupByChange,
  startDate, endDate,
  onSelectL1, onOpenDrawer,
}: Props) {
  const { message } = App.useApp()

  const [l1Data, setL1Data] = useState<ReportGroupRow[]>([])
  const [l1Loading, setL1Loading] = useState(false)
  const [l1Search, setL1Search] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setL1Loading(true)
    setL1Data([])
    getPurchaseGroup({ by: groupBy, startDate, endDate })
      .then(setL1Data)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setL1Loading(false))
  }, [startDate, endDate, groupBy])

  const filteredL1 = l1Search
    ? l1Data.filter(r => r.name.toLowerCase().includes(l1Search.toLowerCase()))
    : l1Data

  const stats = {
    totalAmount: filteredL1.reduce((s, r) => s + r.totalAmount, 0),
    totalQty:    filteredL1.reduce((s, r) => s + r.totalQty, 0),
    totalPieces: filteredL1.reduce((s, r) => s + r.totalPieces, 0),
    orderCount:  filteredL1.reduce((s, r) => s + r.orderCount, 0),
  }

  // ── Labels ──────────────────────────────────────────────────────────────────
  const l1Label = groupBy === 'supplier' ? '供应商' : '货品'

  // ── Columns ─────────────────────────────────────────────────────────────────
  const l1Columns: ColumnsType<ReportGroupRow> = [
    { title: l1Label, dataIndex: 'name', width: 220, render: (v: string) => <span style={{ color: C_LABEL }}>{v}</span> },
    { title: '订单数', dataIndex: 'orderCount', width: 80, align: 'center' },
    { title: '数量', dataIndex: 'totalQty', width: 80, align: 'center' },
    { title: '件数', dataIndex: 'totalPieces', width: 75, align: 'center', render: v => v || '—' },
    { title: '金额', dataIndex: 'totalAmount', width: 130, align: 'right', render: (v: number) => <span style={{ color: C_AMOUNT, fontWeight: 600 }}>¥{v.toFixed(2)}</span> },
    {
      title: '操作', width: 80, align: 'center', fixed: 'right',
      render: (_: unknown, r: ReportGroupRow) => (
        <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => onSelectL1(r)}>查看</Button>
      ),
    },
  ]

  return (
    <>
      <div className={styles.pageTitle}>采购报表</div>

      <div className={styles.toolbar} style={{ flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={v => v && onDateChange(v as [Dayjs, Dayjs])}
          presets={[
            { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
            { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
          ]}
        />
        <Radio.Group value={groupBy} onChange={e => onGroupByChange(e.target.value)}
          optionType="button" buttonStyle="solid"
          options={[
            { label: '按供应商汇总', value: 'supplier' },
            { label: '按货品汇总', value: 'product' },
          ]}
        />
        <Input prefix={<SearchOutlined />} placeholder={`搜索${l1Label}名称/编码`}
          allowClear style={{ width: 220 }} value={l1Search}
          onChange={e => setL1Search(e.target.value)} />
        <Button icon={<DownloadOutlined />} loading={exporting}
          onClick={() => { setExporting(true); exportPurchaseGroupExcel(filteredL1, l1Label, startDate, endDate); setExporting(false) }}>
          导出Excel
        </Button>
      </div>

      <Table
        rowKey="id" size="small" loading={l1Loading}
        dataSource={filteredL1} columns={l1Columns}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
        scroll={{ x: 700 }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ fontWeight: 600, background: '#f0f5ff' }}>
              <Table.Summary.Cell index={0} align="right">合计</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="center">{stats.orderCount}</Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="center">{stats.totalQty}</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="center">{stats.totalPieces || '—'}</Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="center">
                <span style={{ color: C_AMOUNT }}>¥{stats.totalAmount.toFixed(2)}</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </>
  )
}

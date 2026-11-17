import { useEffect, useState } from 'react'
import { Table, DatePicker, Button, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getLossRecords, type LossRecord } from '@/api/loss'
import { getErrorMessage } from '@/utils/error'
import { C_AMOUNT, C_LABEL } from '@/constants/colors'
import styles from './Loss.module.css'

export default function LossRecordList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [records, setRecords] = useState<LossRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)

  const fetchRecords = () => {
    setLoading(true)
    getLossRecords({
      startDate: dateRange?.[0].format('YYYY-MM-DD'),
      endDate:   dateRange?.[1].format('YYYY-MM-DD'),
    })
      .then(setRecords)
      .catch(err => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRecords() }, [dateRange])

  const columns: ColumnsType<LossRecord> = [
    { title: '日期', dataIndex: 'date', width: 110 },
    { title: '编码', dataIndex: 'productCode', width: 100 },
    { title: '货品名称', dataIndex: 'productName', render: (v: string) => <span style={{ color: C_LABEL }}>{v}</span> },
    { title: '单位', dataIndex: 'unit', width: 70, align: 'center' },
    { title: '数量', dataIndex: 'qty', width: 80, align: 'center', render: (v: number) => <span style={{ color: C_AMOUNT, fontWeight: 600 }}>{v}</span> },
    { title: '原因', dataIndex: 'reason', ellipsis: true },
    { title: '备注', dataIndex: 'notes', ellipsis: true },
    { title: '操作人', dataIndex: 'operator', width: 90 },
  ]

  return (
    <>
      <div className={styles.pageTitle}>报损记录</div>

      <div className={styles.toolbar}>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={v => setDateRange(v as [Dayjs, Dayjs] | null)}
          presets={[
            { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
            { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
          ]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/loss/new')}>
          新增报损
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 条` }}
        size="small"
      />
    </>
  )
}

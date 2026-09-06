import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ReportGroupRow } from '@/api/reports'
import SalesOrderModal from '@/components/SalesOrderModal'
import SalesReportSummary from './SalesReportSummary'
import SalesReportDetail from './SalesReportDetail'

export type SalesDim = 'customer' | 'product' | 'supplier'

export default function SalesReport() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'), dayjs().endOf('month'),
  ])
  const [groupBy, setGroupBy] = useState<SalesDim>('customer')
  const [selectedL1, setSelectedL1] = useState<ReportGroupRow | null>(null)
  const [drawerOrderId, setDrawerOrderId] = useState<number | null>(null)

  const startDate = dateRange[0].format('YYYY-MM-DD')
  const endDate   = dateRange[1].format('YYYY-MM-DD')

  useEffect(() => {
    setSelectedL1(null)
  }, [startDate, endDate, groupBy])

  return (
    <>
      <SalesOrderModal orderId={drawerOrderId} onClose={() => setDrawerOrderId(null)} />

      {selectedL1
        ? <SalesReportDetail
            selectedL1={selectedL1}
            startDate={startDate}
            endDate={endDate}
            groupBy={groupBy}
            onBack={() => setSelectedL1(null)}
            onOpenDrawer={setDrawerOrderId}
          />
        : <SalesReportSummary
            dateRange={dateRange}
            onDateChange={setDateRange}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            startDate={startDate}
            endDate={endDate}
            onSelectL1={setSelectedL1}
            onOpenDrawer={setDrawerOrderId}
          />
      }
    </>
  )
}

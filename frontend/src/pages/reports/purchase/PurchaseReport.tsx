import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ReportGroupRow } from '@/api/reports'
import PurchaseOrderDrawer from '@/components/PurchaseOrderDrawer'
import PurchaseReportSummary from './PurchaseReportSummary'
import PurchaseReportDetail from './PurchaseReportDetail'

export type PurchaseDim = 'supplier' | 'product'

export default function PurchaseReport() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'), dayjs().endOf('month'),
  ])
  const [groupBy, setGroupBy] = useState<PurchaseDim>('supplier')
  const [selectedL1, setSelectedL1] = useState<ReportGroupRow | null>(null)
  const [drawerOrderId, setDrawerOrderId] = useState<number | null>(null)

  const startDate = dateRange[0].format('YYYY-MM-DD')
  const endDate   = dateRange[1].format('YYYY-MM-DD')

  useEffect(() => {
    setSelectedL1(null)
  }, [startDate, endDate, groupBy])

  return (
    <>
      <PurchaseOrderDrawer orderId={drawerOrderId} onClose={() => setDrawerOrderId(null)} />

      {selectedL1
        ? <PurchaseReportDetail
            selectedL1={selectedL1}
            startDate={startDate}
            endDate={endDate}
            groupBy={groupBy}
            onBack={() => setSelectedL1(null)}
            onOpenDrawer={setDrawerOrderId}
          />
        : <PurchaseReportSummary
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

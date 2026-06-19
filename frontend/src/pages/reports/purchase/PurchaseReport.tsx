import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ReportGroupRow, ReportOrderRow } from '@/api/reports'
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

  const [l2Cache, setL2Cache] = useState<Record<number, ReportGroupRow[]>>({})
  const [l3Cache, setL3Cache] = useState<Record<string, ReportOrderRow[]>>({})

  const startDate = dateRange[0].format('YYYY-MM-DD')
  const endDate   = dateRange[1].format('YYYY-MM-DD')

  useEffect(() => {
    setSelectedL1(null)
    setL2Cache({})
    setL3Cache({})
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
            l2Cache={l2Cache}
            setL2Cache={setL2Cache}
            l3Cache={l3Cache}
            setL3Cache={setL3Cache}
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
            l2Cache={l2Cache}
            setL2Cache={setL2Cache}
            l3Cache={l3Cache}
            setL3Cache={setL3Cache}
            onSelectL1={setSelectedL1}
            onOpenDrawer={setDrawerOrderId}
          />
      }
    </>
  )
}

import client from "./client";

export interface DashboardSummary {
  todaySales: number;
  todayIncome: number;
  todayPurchase: number;
  todayOrderCount: number;
  monthlySalesRank: {
    customerName: string;
    totalAmount: number;
    totalPieces: number;
  }[];
  monthlyPurchaseRank: {
    supplierName: string;
    totalAmount: number;
    totalQty: number;
  }[];
}

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await client.get<{ data: DashboardSummary }>(
    "/dashboard/summary",
  );
  return res.data.data;
};

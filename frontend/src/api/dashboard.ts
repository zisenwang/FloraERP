import client from "./client";

export interface DashboardSummary {
  todaySales: number;
  todayIncome: number;
  todayPurchase: number;
  todayOrderCount: number;
  monthlySalesRank: {
    customerCode: string;
    customerName: string;
    totalAmount: number;
    totalPieces: number;
  }[];
  monthlyPurchaseSupplierRank: {
    supplierCode: string;
    supplierName: string;
    totalQty: number;
  }[];
  monthlyPurchaseProductRank: {
    productCode: string;
    productName: string;
    supplierCode: string;
    supplierName: string;
    totalQty: number;
  }[];
  monthlyProductProfitRank: {
    productCode: string;
    productName: string;
    supplierCode: string;
    supplierName: string;
    totalProfit: number;
    totalQty: number;
  }[];
}

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await client.get<{ data: DashboardSummary }>(
    "/dashboard/summary",
  );
  return res.data.data;
};

export interface GstSummary {
  period: {
    month: number;
    year: number;
    label: string;
    startDate: string;
    endDate: string;
  };
  filingDue: {
    date: string;
    daysRemaining: number;
    isOverdue: boolean;
  };
  tenant: {
    shopName: string;
    gstin: string;
    state: string;
  };
  outwardSupplies: {
    intraState: GstSupplyDetails;
    interState: GstSupplyDetails;
    totals: GstSupplyDetails & { totalRevenue: number };
  };
  inputTaxCredit: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
    note?: string;
  };
  salesReturns: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
  netPayable: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
}

export interface GstSupplyDetails {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  billCount: number;
}

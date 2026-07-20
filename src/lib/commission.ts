export type CommissionPayoutStatus = "collected";

export type CommissionPayout = {
  id: string;
  /** week:YYYY-MM-DD_YYYY-MM-DD or month:YYYY-MM */
  periodKey: string;
  periodType: "week" | "month";
  label: string;
  incomeAmount: number;
  commissionAmount: number;
  status: CommissionPayoutStatus;
  proofUrl: string;
  note: string;
  collectedAt: string;
};

export function weekPeriodKey(from: string, to: string): string {
  return `week:${from}_${to}`;
}

export function monthPeriodKey(yearMonth: string): string {
  return `month:${yearMonth}`;
}

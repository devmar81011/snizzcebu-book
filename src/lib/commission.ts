export type CommissionPayoutStatus = "collected";

export type CommissionPeriodType = "week" | "month" | "alltime";

export type CommissionPayout = {
  id: string;
  /** week:YYYY-MM-DD_YYYY-MM-DD | month:YYYY-MM | alltime:all */
  periodKey: string;
  periodType: CommissionPeriodType;
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

export function allTimePeriodKey(): string {
  return "alltime:all";
}

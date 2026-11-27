export type UsageBucketKey =
  | 'chatMessages'
  | 'dailyPlans'
  | 'indoorAssessments'
  | 'profileParses'
  | 'impactLogs';

export interface UsageCategoryItem {
  key: UsageBucketKey;
  label: string;
  description: string;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}

export interface UserUsageSummary {
  quotaScope: 'lifetime';
  burstLimitPerMinute: number;
  totalUsed: number;
  totalLimit: number;
  categories: UsageCategoryItem[];
}

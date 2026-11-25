import { callFunction } from '@/lib/callable-client';
import type {
  ImpactLogRecord,
  ImpactSummaryResponse,
  LogImpactInput,
} from '@/models/impact.model';

export async function logImpactAction(input: LogImpactInput): Promise<ImpactLogRecord> {
  return callFunction<LogImpactInput, ImpactLogRecord>('log_impact_action', input);
}

export async function getImpactSummary(days = 14): Promise<ImpactSummaryResponse> {
  return callFunction<{ days: number }, ImpactSummaryResponse>('get_impact_summary', { days });
}

export async function deleteImpactAction(
  logId: string,
): Promise<{ deleted: boolean; logId: string }> {
  return callFunction<{ logId: string }, { deleted: boolean; logId: string }>(
    'delete_impact_action',
    { logId },
  );
}

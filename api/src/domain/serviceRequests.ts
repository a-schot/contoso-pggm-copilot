import type { ServiceRequest } from '../repositories/types.ts';

// Service-level values and overdue rules are documented in docs/domain/service-levels.md.
const SLA_DAYS: Readonly<Record<ServiceRequest['category'], number>> = {
  'address-change': 5,
  'retirement-quote': 10,
  complaint: 14,
  'value-transfer': 30,
};

export interface OverdueServiceRequest extends ServiceRequest {
  dueDate: string;
  daysOverdue: number;
}

export function dueDateForRequest(request: ServiceRequest): string {
  const [year, month, day] = request.createdAt.split('-').map(Number);
  const dueDate = new Date(Date.UTC(year, month - 1, day + SLA_DAYS[request.category]));
  return dueDate.toISOString().slice(0, 10);
}

export function listOverdueServiceRequests(requests: ServiceRequest[], asOf: string): OverdueServiceRequest[] {
  const asOfTime = Date.parse(`${asOf}T00:00:00Z`);
  return requests.flatMap((request) => {
    if (request.status !== 'open' && request.status !== 'in-progress') return [];
    const dueDate = dueDateForRequest(request);
    const daysOverdue = Math.floor((asOfTime - Date.parse(`${dueDate}T00:00:00Z`)) / 86_400_000);
    return daysOverdue > 0 ? [{ ...request, dueDate, daysOverdue }] : [];
  }).sort((a, b) => b.daysOverdue - a.daysOverdue);
}

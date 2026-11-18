import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueDateForRequest, listOverdueServiceRequests } from '../src/domain/serviceRequests.ts';
import type { ServiceRequest } from '../src/repositories/types.ts';
import { startTestServer } from './helpers.ts';

const request = (overrides: Partial<ServiceRequest> = {}): ServiceRequest => ({
  id: 'SR-1',
  memberId: 'M-1',
  category: 'address-change',
  subject: 'Test request',
  description: 'Test description',
  status: 'open',
  createdAt: '2026-02-25',
  closedAt: null,
  ...overrides,
});

test('due date uses calendar days and the category service level across leap day', () => {
  assert.equal(dueDateForRequest(request({ createdAt: '2024-02-25' })), '2024-03-01');
  assert.equal(dueDateForRequest(request({ category: 'value-transfer', createdAt: '2024-02-25' })), '2024-03-26');
});

test('overdue requests exclude due-today and closed requests and sort most overdue first', () => {
  const results = listOverdueServiceRequests([
    request({ id: 'due-today', createdAt: '2026-02-25' }),
    request({ id: 'closed', status: 'closed', createdAt: '2026-02-20' }),
    request({ id: 'older', createdAt: '2026-02-10' }),
    request({ id: 'newer', createdAt: '2026-02-20', status: 'in-progress' }),
  ], '2026-03-02');
  assert.deepEqual(results.map(({ id, dueDate, daysOverdue }) => ({ id, dueDate, daysOverdue })), [
    { id: 'older', dueDate: '2026-02-15', daysOverdue: 15 },
    { id: 'newer', dueDate: '2026-02-25', daysOverdue: 5 },
  ]);
});

test('GET /api/service-requests/overdue returns the required order, due dates, and lateness', async () => {
  const api = await startTestServer();
  try {
    const res = await api.get('/api/service-requests/overdue');
    assert.equal(res.status, 200);
    const requests = await res.json();
    assert.deepEqual(requests.map(({ id, dueDate, daysOverdue }: { id: string; dueDate: string; daysOverdue: number }) => ({
      id, dueDate, daysOverdue,
    })), [
      { id: 'SR-5004', dueDate: '2026-10-15', daysOverdue: 34 },
      { id: 'SR-5001', dueDate: '2026-10-30', daysOverdue: 19 },
      { id: 'SR-5003', dueDate: '2026-11-07', daysOverdue: 11 },
      { id: 'SR-5006', dueDate: '2026-11-15', daysOverdue: 3 },
      { id: 'SR-5005', dueDate: '2026-11-16', daysOverdue: 2 },
    ]);

    const historical = await (await api.get('/api/service-requests/overdue?asOf=2026-10-30')).json();
    assert.deepEqual(historical.map(({ id, daysOverdue }: { id: string; daysOverdue: number }) => ({ id, daysOverdue })), [
      { id: 'SR-5004', daysOverdue: 15 },
    ]);
  } finally {
    await api.close();
  }
});

test('GET /api/service-requests/overdue validates asOf and returns the 400 envelope', async () => {
  const api = await startTestServer();
  try {
    for (const asOf of ['not-a-date', '2026-02-30']) {
      const res = await api.get(`/api/service-requests/overdue?asOf=${asOf}`);
      assert.equal(res.status, 400);
      assert.deepEqual((await res.json()).error, {
        code: 'BAD_REQUEST',
        message: 'asOf must be an ISO date (YYYY-MM-DD)',
      });
    }
  } finally {
    await api.close();
  }
});

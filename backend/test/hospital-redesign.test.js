import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { donorCandidatesSchema, requestFiltersSchema, bloodRequestSchema } from '../src/modules/requests/requests.validation.js';
import { HospitalCandidatesService } from '../src/modules/hospital/candidates.service.js';
import { countPotentialCandidates } from '../src/modules/hospital/candidates.repository.js';
import { RequestsRepository } from '../src/modules/requests/requests.repository.js';
import { pool } from '../src/db.js';

const hospital = { hospitalId: 7, hospitalName: 'Synthetic hospital', provinceCode: 'WP', districtCode: 'CO' };
const requestId = '11111111-1111-4111-8111-111111111111';
const itemId = '22222222-2222-4222-8222-222222222222';
const repository = overrides => ({ memberships: async () => [hospital], validGeography: async () => true,
  count: async () => 3, requestItem: async () => null, ...overrides });

describe('Hospital search and pagination contracts', () => {
  it('bounds pagination and rejects incomplete hierarchy and request context', () => {
    assert.deepEqual(requestFiltersSchema.parse({}).limit, 10);
    for (const input of [{ limit: 101 }, { offset: -1 }, { limit: 'unsafe' }]) assert.equal(requestFiltersSchema.safeParse(input).success, false);
    for (const input of [{ dsCode: 'DS' }, { gnCode: 'GN', districtCode: 'CO' }, { requestId }]) assert.equal(donorCandidatesSchema.safeParse(input).success, false);
    assert.equal(donorCandidatesSchema.safeParse({ bloodTypeCode: 'O+', provinceCode: 'WP' }).success, true);
  });

  it('requires timezone-aware future request dates', () => {
    const payload = { hospitalId: 7, urgency: 'URGENT', items: [{ bloodTypeCode: 'O+', componentCode: 'RBC', unitsRequested: 1 }] };
    assert.equal(bloodRequestSchema.safeParse({ ...payload, neededBy: '2099-01-01T10:00' }).success, false);
    assert.equal(bloodRequestSchema.safeParse({ ...payload, neededBy: '2099-01-01T10:00:00+05:30' }).success, true);
  });

  it('rejects another institution before counting candidates', async () => {
    let counted = false;
    const service = new HospitalCandidatesService(repository({ count: async () => { counted = true; return 1; } }));
    await assert.rejects(service.search('staff', { hospitalId: 8, bloodTypeCode: 'O+' }), { statusCode: 403 });
    assert.equal(counted, false);
  });

  it('rejects invalid geography and request items belonging to another hospital', async () => {
    await assert.rejects(new HospitalCandidatesService(repository({ validGeography: async () => false })).search('staff', { bloodTypeCode: 'O+' }), { statusCode: 400 });
    await assert.rejects(new HospitalCandidatesService(repository()).search('staff', { requestId, requestItemId: itemId }), { statusCode: 404 });
  });

  it('uses the selected item blood group and returns aggregates without donor identities', async () => {
    let applied;
    const service = new HospitalCandidatesService(repository({ requestItem: async () => ({ requestId, requestItemId: itemId, bloodTypeCode: 'AB+', componentCode: 'PLASMA', unitsRequested: 2 }), count: async filters => { applied = filters; return 0; } }));
    const result = await service.search('staff', { hospitalId: 7, requestId, requestItemId: itemId, districtCode: 'JA' });
    assert.equal(result.candidateCount, 0);
    assert.equal(applied.bloodTypeCode, 'AB+');
    assert.equal(applied.districtCode, 'JA');
    assert.equal(result.requestItem.componentCode, 'PLASMA');
    assert.ok(!('donors' in result));
    assert.ok(!('phone' in result));
    await assert.rejects(service.search('staff', { requestId, requestItemId: itemId, bloodTypeCode: 'O-' }), { statusCode: 400 });
  });

  it('delegates deferral/recent donation matching to SQL and retains consent/pending-invitation restrictions', async () => {
    let observed;
    const db = { query: async (sql, params) => { observed = { sql, params }; return { rows: [{ count: 4 }] }; } };
    assert.equal(await countPotentialCandidates({ bloodTypeCode: 'A+', provinceCode: 'WP', districtCode: 'CO', dsCode: 'DS', gnCode: 'GN' }, db), 4);
    assert.match(observed.sql, /fn_match_potential_donors/);
    assert.match(observed.sql, /contact_allowed = TRUE/);
    assert.match(observed.sql, /emergency_appeal_opt_in = TRUE/);
    assert.match(observed.sql, /invitation.status = 'PENDING'/);
    assert.deepEqual(observed.params, ['A+', 'CO', 'DS', 'WP', 'GN']);
  });

  it('counts the same authorized filtered parents before applying deterministic pagination', async () => {
    const calls = [];
    const query = mock.method(pool, 'query', async (sql, params) => { calls.push({ sql, params }); return calls.length === 1 ? { rows: [{ total: 21 }] } : { rows: [{ id: requestId }] }; });
    try {
      const result = await new RequestsRepository().listRequestsByStaff('staff-id', { hospitalId: 7, status: 'OPEN', search: 'synthetic', limit: 10, offset: 20 });
      assert.deepEqual(result.pagination, { total: 21, limit: 10, offset: 20 });
      assert.equal(result.data[0].id, requestId);
      assert.match(calls[0].sql, /EXISTS \(SELECT 1 FROM staff_memberships/);
      assert.match(calls[1].sql, /ORDER BY br.created_at DESC, br.id DESC/);
      assert.ok(!calls[1].sql.includes('synthetic'));
      assert.deepEqual(calls[0].params, ['staff-id', 7, 'OPEN', '%synthetic%']);
      assert.deepEqual(calls[1].params, [...calls[0].params, 10, 20]);
    } finally { query.mock.restore(); }
  });
});

import { Router } from 'express';
import { z } from 'zod';
import { pool, inTransaction } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = Router();
const uuid = z.string().uuid();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM v_public_donation_camps
       WHERE ($1::text IS NULL OR district_code=$1) ORDER BY starts_at LIMIT 100`,
      [req.query.districtCode || null],
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { rows } = await pool.query('SELECT * FROM v_public_donation_camps WHERE camp_id=$1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'No public camp found' });
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
});

const campData = z.object({
  title: z.string().trim().min(4).max(200),
  organizerId: z.number().int().positive(),
  bloodBankId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  capacity: z.number().int().positive().nullable().optional(),
  publicContact: z.string().max(200).optional(),
});
router.post('/', authenticate, requireRole('BANK_STAFF'), async (req, res, next) => {
  try {
    const data = campData.parse(req.body);
    const { rows: staff } = await pool.query(
      'SELECT 1 FROM staff_memberships WHERE user_id=$1 AND blood_bank_id=$2 AND is_active=true',
      [req.user.id, data.bloodBankId],
    );
    if (!staff.length) return res.status(403).json({ error: 'Not assigned to this blood bank' });
    const { rows } = await pool.query(
      `INSERT INTO donation_camps(title,organizer_id,blood_bank_id,location_id,proposed_by,starts_at,ends_at,capacity,public_contact)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,title,status`,
      [data.title, data.organizerId, data.bloodBankId, data.locationId, req.user.id,
        data.startsAt, data.endsAt, data.capacity ?? null, data.publicContact ?? null],
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) { next(err); }
});
router.post('/:id/submit', authenticate, requireRole('BANK_STAFF'), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { rows } = await pool.query(
      `UPDATE donation_camps c SET status='PENDING' WHERE c.id=$1 AND c.status='DRAFT' AND c.starts_at>now()
       AND EXISTS(SELECT 1 FROM staff_memberships sm
           WHERE sm.user_id=$2 AND sm.blood_bank_id=c.blood_bank_id AND sm.is_active)
       RETURNING c.id,c.status`, [id, req.user.id],
    );
    if (!rows[0]) return res.status(409).json({ error: 'Camp is unavailable or not owned by this bank' });
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
});
router.post('/:id/approve', authenticate, requireRole('BANK_STAFF'), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    await inTransaction(async client => {
      await client.query('CALL sp_approve_donation_camp($1,$2)', [id, req.user.id]);
    });
    res.json({ message: 'Camp approved' });
  } catch (err) { next(err); }
});
router.post('/:id/registrations', authenticate, requireRole('DONOR'), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { rows } = await pool.query(
      `INSERT INTO camp_registrations(camp_id,donor_id)
       SELECT $1,d.id FROM donors d WHERE d.user_id=$2
       RETURNING id,camp_id,status,registered_at`, [id, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Donor profile missing' });
    res.status(201).json({ data: rows[0] });
  } catch (err) { next(err); }
});
export default router;

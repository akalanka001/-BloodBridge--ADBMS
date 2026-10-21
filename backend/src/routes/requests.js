import { Router } from 'express';
import { z } from 'zod';
import { inTransaction, pool } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { broadcastEmergencyRequest } from '../socket.js';
const router = Router();
router.use(authenticate, requireRole('HOSPITAL_STAFF'));
const schema = z.object({
  hospitalId: z.number().int().positive(),
  urgency: z.enum(['ROUTINE','URGENT','CRITICAL']),
  neededBy: z.string().datetime({ offset: true }),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(z.object({
    bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']),
    componentCode: z.enum(['RBC','PLASMA','PLATELETS']),
    unitsRequested: z.number().int().positive().max(100),
  })).min(1).max(10),
});
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT br.id,br.hospital_id,br.urgency,br.status,br.needed_by,br.created_at
       FROM blood_requests br
       JOIN staff_memberships sm ON sm.hospital_id=br.hospital_id
       WHERE sm.user_id=$1 AND sm.is_active
       ORDER BY br.created_at DESC LIMIT 100`, [req.user.id],
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});
router.post('/', async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    if (new Date(data.neededBy) <= new Date()) return res.status(400).json({ error: 'neededBy must be in the future' });
    const output = await inTransaction(async client => {
      const staff = await client.query(
        'SELECT 1 FROM staff_memberships WHERE user_id=$1 AND hospital_id=$2 AND is_active',
        [req.user.id, data.hospitalId],
      );
      if (!staff.rows.length) return null;
      const { rows } = await client.query(
        `INSERT INTO blood_requests(hospital_id,created_by,urgency,needed_by,notes)
         VALUES($1,$2,$3,$4,$5) RETURNING id,status,created_at`,
        [data.hospitalId, req.user.id, data.urgency, data.neededBy, data.notes ?? null],
      );
      for (const item of data.items) {
        await client.query(
          `INSERT INTO request_items(request_id,blood_type_code,component_code,units_requested)
           VALUES($1,$2,$3,$4)`,
          [rows[0].id, item.bloodTypeCode, item.componentCode, item.unitsRequested],
        );
      }
      return rows[0];
    });
    if (!output) return res.status(403).json({ error: 'Not assigned to requested hospital' });
    if (data.urgency === 'CRITICAL' || data.urgency === 'URGENT') {
      broadcastEmergencyRequest({
        id: output.id,
        hospitalName: `Hospital #${data.hospitalId}`,
        urgency: data.urgency,
        bloodTypeCode: data.items[0]?.bloodTypeCode,
        componentCode: data.items[0]?.componentCode,
        unitsRequested: data.items.reduce((sum, i) => sum + i.unitsRequested, 0),
        neededBy: data.neededBy,
      });
    }
    res.status(201).json({ data: output });

  } catch (err) { next(err); }
});
export default router;

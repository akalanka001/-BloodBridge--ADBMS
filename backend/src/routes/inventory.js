import { Router } from 'express';
import { z } from 'zod';
import { pool, inTransaction } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = Router();
router.use(authenticate, requireRole('BANK_STAFF','HOSPITAL_STAFF','ADMIN'));
router.get('/summary', async (req, res, next) => {
  try {
    const params = [];
    let where = '';
    if (req.user.role === 'BANK_STAFF') {
      params.push(req.user.id);
      where = `WHERE blood_bank_id IN (SELECT blood_bank_id FROM staff_memberships WHERE user_id=$1 AND is_active AND blood_bank_id IS NOT NULL)`;
    }
    const { rows } = await pool.query(`SELECT * FROM v_available_blood_stock ${where} ORDER BY blood_bank_name,blood_type_code LIMIT 300`,params);
    res.json({ data: rows });
  } catch (err) { next(err); }
});
router.post('/reservations', requireRole('BANK_STAFF'), async (req, res, next) => {
  try {
    const data = z.object({ requestItemId: z.string().uuid(), bloodUnitId: z.string().uuid() }).parse(req.body);
    const result = await inTransaction(async client => {
      const { rows } = await client.query('SELECT fn_reserve_blood_unit($1,$2,$3) AS id',
        [data.requestItemId,data.bloodUnitId,req.user.id]);
      return rows[0];
    });
    res.status(201).json({ data: result });
  } catch (err) { next(err); }
});
export default router;

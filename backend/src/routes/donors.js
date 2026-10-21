import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = Router();
router.use(authenticate, requireRole('DONOR'));
router.get('/me', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.blood_type_code, d.district_code, d.ds_code,
              d.available_for_contact, d.camp_notifications_opt_in,
              (SELECT count(*) FROM donations dn WHERE dn.donor_id=d.id)::int AS donation_count
       FROM donors d WHERE d.user_id=$1`, [req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Donor profile not found' });
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
});
router.patch('/me/preferences', async (req, res, next) => {
  try {
    const value = z.object({
      availableForContact: z.boolean(),
      campNotificationsOptIn: z.boolean(),
    }).parse(req.body);
    const { rows } = await pool.query(
      `UPDATE donors SET available_for_contact=$1,camp_notifications_opt_in=$2
       WHERE user_id=$3 RETURNING id,available_for_contact,camp_notifications_opt_in`,
      [value.availableForContact, value.campNotificationsOptIn, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Donor profile not found' });
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
});
export default router;

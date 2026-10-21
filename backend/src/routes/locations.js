import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();

router.get('/provinces', async (_req, res, next) => {
  try { res.json({ data: (await pool.query('SELECT code,name FROM provinces ORDER BY name')).rows }); }
  catch (err) { next(err); }
});
router.get('/districts', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT code,name,province_code FROM districts
       WHERE ($1::text IS NULL OR province_code=$1) ORDER BY name`,
      [req.query.provinceCode || null],
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});
router.get('/ds-divisions', async (req, res, next) => {
  try {
    if (!req.query.districtCode) return res.status(400).json({ error: 'districtCode is required' });
    const { rows } = await pool.query(
      'SELECT code,name,district_code FROM ds_divisions WHERE district_code=$1 ORDER BY name',
      [req.query.districtCode],
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});
export default router;

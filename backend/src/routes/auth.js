import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { inTransaction, pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const registration = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255).transform(x => x.toLowerCase()),
  password: z.string().min(10).max(128),
  districtCode: z.string().trim().min(1).max(20),
  dsCode: z.string().trim().max(20).nullable().optional(),
  bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']).nullable().optional(),
  availableForContact: z.boolean().default(false),
  campNotificationsOptIn: z.boolean().default(false),
});

router.post('/register-donor', async (req, res, next) => {
  try {
    const data = registration.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const registered = await inTransaction(async client => {
      const userResult = await client.query(
        `INSERT INTO users(full_name,email,password_hash,role)
         VALUES ($1,$2,$3,'DONOR') RETURNING id,full_name,email,role`,
        [data.fullName, data.email, passwordHash],
      );
      const user = userResult.rows[0];
      await client.query(
        `INSERT INTO donors(user_id,blood_type_code,district_code,ds_code,available_for_contact,camp_notifications_opt_in)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [user.id, data.bloodTypeCode ?? null, data.districtCode, data.dsCode || null,
          data.availableForContact, data.campNotificationsOptIn],
      );
      return user;
    });
    res.status(201).json({ message: 'Donor account created', user: registered });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const values = z.object({ email: z.string().trim().email(), password: z.string() }).parse(req.body);
    const { rows } = await pool.query(
      'SELECT id,email,full_name,password_hash,role FROM users WHERE email=$1 AND is_active=true',
      [values.email.toLowerCase()],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(values.password, user.password_hash))) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    const token = jwt.sign({}, process.env.JWT_SECRET, { subject: user.id, expiresIn: '8h' });
    res.json({ token, user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
export default router;

import { pool } from '../db.js';

/**
 * Middleware enforcing that staff users belong to the specific institution
 * referenced in the route parameters, body, or query.
 *
 * @param {'HOSPITAL' | 'BLOOD_BANK' | 'ANY'} expectedType
 */
export function requireInstitution(expectedType = 'ANY') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // ADMIN role bypasses institution restriction
      if (req.user.role === 'ADMIN') {
        return next();
      }

      const targetHospitalId =
        req.params.hospitalId ||
        (expectedType === 'HOSPITAL' ? req.params.id : null) ||
        req.body?.hospitalId ||
        req.query?.hospitalId;

      const targetBankId =
        req.params.bloodBankId ||
        req.params.bankId ||
        (expectedType === 'BLOOD_BANK' ? req.params.id : null) ||
        req.body?.bloodBankId ||
        req.body?.bankId ||
        req.query?.bloodBankId ||
        req.query?.bankId;

      const { rows } = await pool.query(
        `SELECT hospital_id, blood_bank_id
         FROM staff_memberships
         WHERE user_id = $1 AND is_active = true`,
        [req.user.id],
      );

      if (!rows.length) {
        return res.status(403).json({ error: 'No active institutional membership found' });
      }

      const userMemberships = rows;

      if (expectedType === 'HOSPITAL') {
        if (req.user.role !== 'HOSPITAL_STAFF') {
          return res.status(403).json({ error: 'Hospital staff access required' });
        }
        if (targetHospitalId) {
          const match = userMemberships.some(
            (m) => String(m.hospital_id) === String(targetHospitalId),
          );
          if (!match) {
            return res.status(403).json({ error: 'Forbidden: unauthorized hospital scope' });
          }
        }
      } else if (expectedType === 'BLOOD_BANK') {
        if (req.user.role !== 'BANK_STAFF') {
          return res.status(403).json({ error: 'Blood bank staff access required' });
        }
        if (targetBankId) {
          const match = userMemberships.some(
            (m) => String(m.blood_bank_id) === String(targetBankId),
          );
          if (!match) {
            return res.status(403).json({ error: 'Forbidden: unauthorized blood bank scope' });
          }
        }
      } else {
        // ANY institution: must match target if specified
        if (targetHospitalId) {
          const match = userMemberships.some(
            (m) => String(m.hospital_id) === String(targetHospitalId),
          );
          if (!match) {
            return res.status(403).json({ error: 'Forbidden: unauthorized hospital scope' });
          }
        }
        if (targetBankId) {
          const match = userMemberships.some(
            (m) => String(m.blood_bank_id) === String(targetBankId),
          );
          if (!match) {
            return res.status(403).json({ error: 'Forbidden: unauthorized blood bank scope' });
          }
        }
      }

      req.memberships = userMemberships;
      next();
    } catch (err) {
      next(err);
    }
  };
}

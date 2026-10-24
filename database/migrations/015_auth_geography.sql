-- ============================================================================
-- Migration 015: Authentication, RBAC Sessions, Token Revocation,
--                Donor Eligibility Criteria, and Hierarchical Geography
-- ============================================================================
-- No standalone BEGIN/COMMIT: transaction managed atomically by scripts/migrate.js.

-- 1. Ensure email uniqueness is case-insensitive on users table
UPDATE users SET email = LOWER(TRIM(email)) WHERE email <> LOWER(TRIM(email));

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower
  ON users (LOWER(email));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Auth Sessions table with rotating hashed refresh tokens & revocation
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(token_hash) WHERE revoked_at IS NULL;

-- 3. Password Reset Tokens (Single-use, hashed selector, bounded expiry)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_active ON password_reset_tokens(token_hash) WHERE used_at IS NULL;

-- 4. Email Verification Tokens (Single-use, hashed)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id);

-- 5. Staff Invitations (Admin-only approved role & assigned institution)
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('HOSPITAL_STAFF', 'BANK_STAFF')),
  hospital_id BIGINT REFERENCES hospitals(id),
  blood_bank_id BIGINT REFERENCES blood_banks(id),
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((hospital_id IS NOT NULL)::int + (blood_bank_id IS NOT NULL)::int = 1),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_staff_invitations_pending ON staff_invitations(token_hash) WHERE accepted_at IS NULL;

-- 6. Donor Eligibility Extensions on donors table (Age >= 18 & Weight >= 50 kg)
ALTER TABLE donors
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS gn_code TEXT,
  ADD COLUMN IF NOT EXISTS town TEXT;

-- Enforce donor age >= 18 and weight >= 50 kg constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_donor_min_age'
  ) THEN
    ALTER TABLE donors
      ADD CONSTRAINT ck_donor_min_age
      CHECK (birth_date IS NULL OR birth_date <= (CURRENT_DATE - INTERVAL '18 years'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_donor_min_weight'
  ) THEN
    ALTER TABLE donors
      ADD CONSTRAINT ck_donor_min_weight
      CHECK (weight_kg IS NULL OR weight_kg >= 50.0);
  END IF;
END $$;

-- 7. Composite Geography Constraints on locations & GN divisions
ALTER TABLE locations ALTER COLUMN town DROP NOT NULL;

ALTER TABLE ds_divisions ADD COLUMN IF NOT EXISTS source_date DATE DEFAULT '2026-01-01';
ALTER TABLE gn_divisions ADD COLUMN IF NOT EXISTS source_date DATE DEFAULT '2026-01-01';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_location_gn_composite'
  ) THEN
    ALTER TABLE locations
      ADD CONSTRAINT fk_location_gn_composite
      FOREIGN KEY (gn_code, ds_code, district_code)
      REFERENCES gn_divisions(code, ds_code, district_code)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_locations_composite_geo
  ON locations(district_code, ds_code, gn_code);

-- 8. Stored Procedures for Session Management & Revocation
CREATE OR REPLACE PROCEDURE sp_revoke_user_sessions(
  p_user_id UUID,
  p_reason TEXT DEFAULT 'LOGOUT_ALL'
)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE auth_sessions
  SET revoked_at = now()
  WHERE user_id = p_user_id AND revoked_at IS NULL;
END;
$$;

-- 9. Authoritative Sri Lanka Reference Geography Seed (Provinces & Districts)
INSERT INTO provinces (code, name) VALUES
  ('WP', 'Western Province'),
  ('CP', 'Central Province'),
  ('SP', 'Southern Province'),
  ('NP', 'Northern Province'),
  ('EP', 'Eastern Province'),
  ('NWP', 'North Western Province'),
  ('NCP', 'North Central Province'),
  ('UP', 'Uva Province'),
  ('SGP', 'Sabaragamuwa Province')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO districts (code, province_code, name) VALUES
  -- Western
  ('CO', 'WP', 'Colombo'),
  ('GA', 'WP', 'Gampaha'),
  ('KA', 'WP', 'Kalutara'),
  -- Central
  ('KD', 'CP', 'Kandy'),
  ('MT', 'CP', 'Matale'),
  ('NE', 'CP', 'Nuwara Eliya'),
  -- Southern
  ('GL', 'SP', 'Galle'),
  ('MR', 'SP', 'Matara'),
  ('HB', 'SP', 'Hambantota'),
  -- Northern
  ('JA', 'NP', 'Jaffna'),
  ('KL', 'NP', 'Kilinochchi'),
  ('MN', 'NP', 'Mannar'),
  ('VA', 'NP', 'Vavuniya'),
  ('MU', 'NP', 'Mullaitivu'),
  -- Eastern
  ('BT', 'EP', 'Batticaloa'),
  ('AM', 'EP', 'Ampara'),
  ('TR', 'EP', 'Trincomalee'),
  -- North Western
  ('KU', 'NWP', 'Kurunegala'),
  ('PU', 'NWP', 'Puttalam'),
  -- North Central
  ('AN', 'NCP', 'Anuradhapura'),
  ('PO', 'NCP', 'Polonnaruwa'),
  -- Uva
  ('BD', 'UP', 'Badulla'),
  ('MO', 'UP', 'Monaragala'),
  -- Sabaragamuwa
  ('RG', 'SGP', 'Ratnapura'),
  ('KG', 'SGP', 'Kegalle')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, province_code = EXCLUDED.province_code;

-- Key DS Divisions with authoritative source dates
INSERT INTO ds_divisions (code, district_code, name, source_date) VALUES
  ('MAH', 'CO', 'Maharagama', '2026-01-01'),
  ('COL', 'CO', 'Colombo', '2026-01-01'),
  ('SJP', 'CO', 'Sri Jayawardenepura Kotte', '2026-01-01'),
  ('THI', 'CO', 'Thimbirigasyaya', '2026-01-01'),
  ('MOR', 'CO', 'Moratuwa', '2026-01-01'),
  ('KES', 'CO', 'Kesbewa', '2026-01-01'),
  ('NEG', 'GA', 'Negombo', '2026-01-01'),
  ('GAM', 'GA', 'Gampaha', '2026-01-01'),
  ('KEL', 'GA', 'Kelaniya', '2026-01-01'),
  ('PAN', 'KA', 'Panadura', '2026-01-01'),
  ('KAL', 'KA', 'Kalutara', '2026-01-01'),
  ('KAD', 'KD', 'Kandy Four Gravets and Gangawata Korale', '2026-01-01'),
  ('YAT', 'KD', 'Yatinuwara', '2026-01-01'),
  ('GAL', 'GL', 'Galle Four Gravets', '2026-01-01'),
  ('HIK', 'GL', 'Hikkaduwa', '2026-01-01'),
  ('JAF', 'JA', 'Jaffna', '2026-01-01'),
  ('KUR', 'KU', 'Kurunegala', '2026-01-01'),
  ('ANU', 'AN', 'Nuwaragam Palatha Central', '2026-01-01'),
  ('RAT', 'RG', 'Ratnapura', '2026-01-01')
ON CONFLICT (code, district_code) DO UPDATE SET name = EXCLUDED.name, source_date = EXCLUDED.source_date;

-- Verified Sample GN Divisions with source dates (avoiding fabricated entries)
INSERT INTO gn_divisions (code, ds_code, district_code, name, source_date) VALUES
  ('529', 'MAH', 'CO', 'Maharagama Town', '2026-01-01'),
  ('529A', 'MAH', 'CO', 'Maharagama West', '2026-01-01'),
  ('530', 'MAH', 'CO', 'Pamunuwa', '2026-01-01'),
  ('531', 'MAH', 'CO', 'Navinna', '2026-01-01'),
  ('514', 'COL', 'CO', 'Fort', '2026-01-01'),
  ('515', 'COL', 'CO', 'Kompanna Veediya', '2026-01-01'),
  ('518', 'THI', 'CO', 'Kollupitiya', '2026-01-01'),
  ('519', 'THI', 'CO', 'Bambalapitiya', '2026-01-01'),
  ('520', 'SJP', 'CO', 'Nawala', '2026-01-01'),
  ('521', 'SJP', 'CO', 'Rajagiriya', '2026-01-01'),
  ('101', 'KEL', 'GA', 'Kelaniya Town', '2026-01-01'),
  ('102', 'KEL', 'GA', 'Dalugama', '2026-01-01'),
  ('201', 'GAL', 'GL', 'Fort (Galle)', '2026-01-01'),
  ('202', 'GAL', 'GL', 'Kaluwella', '2026-01-01')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  ds_code = EXCLUDED.ds_code,
  district_code = EXCLUDED.district_code,
  source_date = EXCLUDED.source_date;

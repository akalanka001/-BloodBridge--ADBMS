-- Minimal reference fixtures for development ONLY; NOT a complete official administrative dataset.
-- WP/CO/GA/KA/... are local DEMO identifiers, not necessarily official DCS codes.
BEGIN;
INSERT INTO provinces (code,name) VALUES
 ('WP','Western'),('CP','Central'),('SP','Southern') ON CONFLICT DO NOTHING;
INSERT INTO districts(code,province_code,name) VALUES
 ('CO','WP','Colombo'),('GA','WP','Gampaha'),('KA','WP','Kalutara'),
 ('KD','CP','Kandy'),('GL','SP','Galle') ON CONFLICT DO NOTHING;
INSERT INTO ds_divisions(code,district_code,name) VALUES
 ('MAH','CO','Maharagama'),('COL','CO','Colombo'),('KAD','KD','Kandy Four Gravets and Gangawata Korale')
 ON CONFLICT DO NOTHING;
INSERT INTO blood_types(code) VALUES ('O-'),('O+'),('A-'),('A+'),('B-'),('B+'),('AB-'),('AB+')
 ON CONFLICT DO NOTHING;
INSERT INTO component_types(code,name) VALUES
 ('RBC','Red blood cells'),('PLASMA','Plasma'),('PLATELETS','Platelets')
 ON CONFLICT DO NOTHING;
COMMIT;
-- For demo: separately seed fake users, hospitals, banks, units and camps with sensible future dates.
-- Never represent fictional records as actual Sri Lankan hospital inventory/camp schedules.

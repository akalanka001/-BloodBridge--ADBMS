import { pool } from '../../db.js';

export class GeographyRepository {
  async listProvinces() {
    const { rows } = await pool.query('SELECT code, name FROM provinces ORDER BY name');
    return rows;
  }

  async listDistricts(provinceCode = null) {
    const { rows } = await pool.query(
      `SELECT d.code, d.name, d.province_code, p.name AS province_name
       FROM districts d
       JOIN provinces p ON p.code = d.province_code
       WHERE ($1::text IS NULL OR d.province_code = $1)
       ORDER BY d.name`,
      [provinceCode || null],
    );
    return rows;
  }

  async listDsDivisions(districtCode, provinceCode = null) {
    const { rows } = await pool.query(
      `SELECT ds.code, ds.name, ds.district_code, d.name AS district_name,
              ds.source_date
       FROM ds_divisions ds
       JOIN districts d ON d.code = ds.district_code
       WHERE ds.district_code = $1
         AND ($2::text IS NULL OR d.province_code = $2)
       ORDER BY ds.name`,
      [districtCode, provinceCode || null],
    );
    return rows;
  }

  async listGnDivisions(dsCode = null, districtCode = null) {
    const { rows } = await pool.query(
      `SELECT gn.code, gn.name, gn.ds_code, gn.district_code,
              ds.name AS ds_name, d.name AS district_name, gn.source_date
       FROM gn_divisions gn
       JOIN ds_divisions ds ON ds.code = gn.ds_code AND ds.district_code = gn.district_code
       JOIN districts d ON d.code = gn.district_code
       WHERE ($1::text IS NULL OR gn.ds_code = $1)
         AND ($2::text IS NULL OR gn.district_code = $2)
       ORDER BY gn.code`,
      [dsCode || null, districtCode || null],
    );
    return rows;
  }

  async verifyDistrictBelongsToProvince(districtCode, provinceCode) {
    const { rows } = await pool.query(
      'SELECT 1 FROM districts WHERE code = $1 AND province_code = $2',
      [districtCode, provinceCode],
    );
    return rows.length > 0;
  }

  async verifyDsBelongsToDistrict(dsCode, districtCode) {
    const { rows } = await pool.query(
      'SELECT 1 FROM ds_divisions WHERE code = $1 AND district_code = $2',
      [dsCode, districtCode],
    );
    return rows.length > 0;
  }
}

export const geographyRepository = new GeographyRepository();

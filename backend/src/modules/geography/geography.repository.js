import { pool } from '../../db.js';

export class GeographyRepository {
  async listProvinces() {
    const { rows } = await pool.query('SELECT code, name FROM provinces ORDER BY name');
    return rows;
  }

  async listDistricts(provinceCode = null) {
    const { rows } = await pool.query(
      `SELECT code, name, province_code
       FROM districts
       WHERE ($1::text IS NULL OR province_code = $1)
       ORDER BY name`,
      [provinceCode || null],
    );
    return rows;
  }

  async listDsDivisions(districtCode) {
    const { rows } = await pool.query(
      `SELECT code, name, district_code
       FROM ds_divisions
       WHERE district_code = $1
       ORDER BY name`,
      [districtCode],
    );
    return rows;
  }

  async listGnDivisions(dsCode = null) {
    const { rows } = await pool.query(
      `SELECT code, name, ds_code
       FROM gn_divisions
       WHERE ($1::text IS NULL OR ds_code = $1)
       ORDER BY name`,
      [dsCode || null],
    );
    return rows;
  }
}

export const geographyRepository = new GeographyRepository();

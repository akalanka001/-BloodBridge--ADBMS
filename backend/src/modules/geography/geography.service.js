import { geographyRepository } from './geography.repository.js';
import { BadRequestError } from '../../infrastructure/errors.js';

export class GeographyService {
  async getProvinces() {
    return geographyRepository.listProvinces();
  }

  async getDistricts(provinceCode) {
    return geographyRepository.listDistricts(provinceCode);
  }

  async getDsDivisions(districtCode, provinceCode) {
    if (provinceCode) {
      const valid = await geographyRepository.verifyDistrictBelongsToProvince(districtCode, provinceCode);
      if (!valid) {
        throw new BadRequestError(`District '${districtCode}' does not belong to province '${provinceCode}'`);
      }
    }
    return geographyRepository.listDsDivisions(districtCode, provinceCode);
  }

  async getGnDivisions(dsCode, districtCode) {
    if (dsCode && districtCode) {
      const valid = await geographyRepository.verifyDsBelongsToDistrict(dsCode, districtCode);
      if (!valid) {
        throw new BadRequestError(`DS Division '${dsCode}' does not belong to district '${districtCode}'`);
      }
    }
    return geographyRepository.listGnDivisions(dsCode, districtCode);
  }
}

export const geographyService = new GeographyService();

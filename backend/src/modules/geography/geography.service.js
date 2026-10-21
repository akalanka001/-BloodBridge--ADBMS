import { geographyRepository } from './geography.repository.js';

export class GeographyService {
  async getProvinces() {
    return geographyRepository.listProvinces();
  }

  async getDistricts(provinceCode) {
    return geographyRepository.listDistricts(provinceCode);
  }

  async getDsDivisions(districtCode) {
    return geographyRepository.listDsDivisions(districtCode);
  }

  async getGnDivisions(dsCode) {
    return geographyRepository.listGnDivisions(dsCode);
  }
}

export const geographyService = new GeographyService();

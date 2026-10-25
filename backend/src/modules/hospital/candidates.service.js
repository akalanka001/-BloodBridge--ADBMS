import { hospitalCandidatesRepository } from './candidates.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../infrastructure/errors.js';

export class HospitalCandidatesService {
  constructor(repository = hospitalCandidatesRepository) { this.repository = repository; }

  async context(userId, hospitalId) {
    const memberships = await this.repository.memberships(userId);
    const hospital = hospitalId ? memberships.find(row => row.hospitalId === Number(hospitalId)) : memberships[0];
    if (!hospital) throw new ForbiddenError('No active assignment to this hospital');
    return { ...hospital, memberships };
  }

  async search(userId, filters) {
    const context = await this.context(userId, filters.hospitalId);
    const { memberships: _memberships, ...hospital } = context;
    if (!await this.repository.validGeography(filters)) throw new BadRequestError('Selected geographical divisions do not form a valid hierarchy');
    let requestItem = null;
    if (filters.requestId) {
      requestItem = await this.repository.requestItem(filters.requestId, filters.requestItemId, hospital.hospitalId);
      if (!requestItem) throw new NotFoundError('Request item not found for this hospital');
      if (filters.bloodTypeCode && filters.bloodTypeCode !== requestItem.bloodTypeCode) {
        throw new BadRequestError('Blood group must match the selected request item');
      }
    }
    const bloodTypeCode = requestItem?.bloodTypeCode || filters.bloodTypeCode;
    if (!bloodTypeCode) throw new BadRequestError('Choose a known blood group or request item');
    const appliedFilters = {
      bloodTypeCode, provinceCode: filters.provinceCode || null, districtCode: filters.districtCode || null,
      dsCode: filters.dsCode || null, gnCode: filters.gnCode || null,
    };
    return {
      candidateCount: await this.repository.count(appliedFilters), appliedFilters, hospital, requestItem,
      queriedAt: new Date().toISOString(),
      definition: 'Potential donor candidates with contact availability and emergency outreach consent; current deferrals, recent donations and pending invitations excluded. Counts are not medical clearance or component compatibility.',
    };
  }
}
export const hospitalCandidatesService = new HospitalCandidatesService();

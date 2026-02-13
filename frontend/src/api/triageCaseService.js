import apiClient from "./axios";

class TriageCaseService {
  async getAllCases() {
    const res = await apiClient.get('triage-cases/');
    return res.data;
  }

  async getCaseById(id) {
    const res = apiClient.get(`/triage-cases/${id}`);
    return res.data;
  }

  async createCase(caseData) {
    const res = apiClient.post('/triage-cases', caseData);
    return res.data;
  }

  async updateCase(id, updateData) {
    const res = await apiClient.patch(`/triage-cases/${id}`, updateData);
    return res.data;
  }

  async reviewCase(id, updateData) {
    const res = await apiClient.patch(`/triage-cases/${id}/review`, updateData);
    return res.data;
  }

  async getCaseChangelog(id) {
    const res = await apiClient.get(`/triage-cases/${id}/changelog`);
    return res.data;
  }
}

export const triageCaseService = new TriageCaseService();
export default TriageCaseService;
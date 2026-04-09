import apiClient from "./axios";

class TriageCaseService {
  async getAllCases() {
    const res = await apiClient.get('triage-cases/');
    return res.data;
  }

  async getCaseById(id) {
    const res = await apiClient.get(`/triage-cases/${id}`);
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

  async getUploadUrl(caseId, fileName) {
    const res = await apiClient.get(`/triage-cases/${caseId}/upload-url`, {
      params: { file_name: fileName },
    });
    return res.data;
  }
  async addCaseFile(caseId, fileData) {
    const res = await apiClient.post(`/triage-cases/${caseId}/files`, fileData);
    return res.data;
  }
  async getCaseFiles(caseId) {
    const res = await apiClient.get(`/triage-cases/${caseId}/files`);
    return res.data;
  }
  async deleteCaseFile(caseId, fileId) {
    const res = await apiClient.delete(`/triage-cases/${caseId}/files/${fileId}`);
    return res.data;
  }

}

export const triageCaseService = new TriageCaseService();
export default TriageCaseService;
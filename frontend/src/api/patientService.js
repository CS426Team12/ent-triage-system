import apiClient from "./axios";

class PatientService {
  async getPatientById(id) {
    const res = await apiClient.get(`/patients/${id}`);
    return res.data;
  }

  async updatePatient(id, updateData) {
    const res = await apiClient.patch(`/patients/${id}`, updateData);
    return res.data;
  }

  async getPatientChangelog(id) {
    const res = await apiClient.get(`/patients/${id}/changelog`);
    return res.data;
  }
}

export const patientService = new PatientService();
export default PatientService;
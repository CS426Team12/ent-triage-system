import { createContext, useContext, useCallback } from "react";
import { patientService } from "../api/patientService";

const PatientContext = createContext();

export function PatientProvider({ children }) {
  const fetchPatientById = useCallback(async (id) => {
    if (!id) return;
    return await patientService.getPatientById(id);
  }, []);

  const updatePatient = useCallback(async (id, updates) => {
    if (!id || !updates || Object.keys(updates).length === 0) return;
    const updatedPatient = await patientService.updatePatient(id, updates);
    return updatedPatient;
  }, []);

  const fetchPatientChangelog = useCallback(async (id) => {
    if (!id) return [];
    return await patientService.getPatientChangelog(id);
  }, []);

  const value = {
    fetchPatientById,
    updatePatient,
    fetchPatientChangelog,
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatients() {
  return useContext(PatientContext);
}
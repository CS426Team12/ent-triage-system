import { createContext, useContext, useState, useCallback } from "react";
import { triageCaseApi } from "../api/triageCaseApi";
import { STATUS_VALUES } from "../utils/consts";

const TriageCaseContext = createContext();

export function TriageCaseProvider({ children }) {
  const [cases, setCases] = useState([]); // update and track local state for now to avoid too many calls to the db

  const fetchCases = useCallback(async () => {
    const data = await triageCaseApi.getAllCases();
    const cases = data.cases;
    setCases(cases);
    return cases;
  }, []);

  const getUnreviewedCases = useCallback(() => {
    if (!cases || cases.length === 0) return [];
    return cases.filter((c) => c.status !== STATUS_VALUES.REVIEWED);
  }, [cases]);

  const getReviewedCases = useCallback(() => {
    if (!cases || cases.length === 0) return [];
    return cases.filter((c) => c.status === STATUS_VALUES.REVIEWED);
  }, [cases]);

  const fetchCaseById = useCallback(async (id) => {
    if (!id) return;
    return await triageCaseApi.getCaseById(id);
  }, []);

  const updateCase = useCallback(async (id, updates) => {
    if (!id || !updates || Object.keys(updates).length === 0) return;
    const updatedCase = await triageCaseApi.updateCase(id, updates);
    setCases((prev) => prev.map((c) => (c.caseID === id ? updatedCase : c)));
    return updatedCase;
  }, []);

  const reviewCase = useCallback(async (id, updates) => {
    if (!id || !updates || Object.keys(updates).length === 0) return;
    const updatedCase = await triageCaseApi.reviewCase(id, updates);
    setCases((prev) => prev.map((c) => (c.caseID === id ? updatedCase : c)));
    return updatedCase;
  }, []);

  const createCase = useCallback(async (caseData) => {
    if (!caseData || Object.keys(caseData).length === 0) return;
    const newCase = await triageCaseApi.createCase(caseData);
    setCases((prev) => [...prev, newCase]);
    return newCase;
  }, []);

  const value = {
    cases,
    fetchCases,
    fetchCaseById,
    updateCase,
    createCase,
    reviewCase,
    getUnreviewedCases,
    getReviewedCases,
  };

  return (
    <TriageCaseContext.Provider value={value}>
      {children}
    </TriageCaseContext.Provider>
  );
}

export function useTriageCases() {
  return useContext(TriageCaseContext);
}

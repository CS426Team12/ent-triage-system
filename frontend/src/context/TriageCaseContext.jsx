import { createContext, useContext, useState, useCallback } from "react";
import { triageCaseService } from "../api/triageCaseService";
import { STATUS_VALUES } from "../utils/consts";

const TriageCaseContext = createContext();

export function TriageCaseProvider({ children }) {
  const [cases, setCases] = useState([]);

  const fetchCases = useCallback(async () => {
    const data = await triageCaseService.getAllCases();
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
    const data = await triageCaseService.getCaseById(id);
    setCases((prev) => prev.map((c) => (c.caseID === id ? data : c)));
    return data;
  }, []);

  const updateCase = useCallback(async (id, updates) => {
    if (!id || !updates || Object.keys(updates).length === 0) return;
    const updatedCase = await triageCaseService.updateCase(id, updates);
    setCases((prev) => prev.map((c) => (c.caseID === id ? updatedCase : c)));
    return updatedCase;
  }, []);

  const reviewCase = useCallback(async (id, updates) => {
    if (!id || !updates || Object.keys(updates).length === 0) return;
    const updatedCase = await triageCaseService.reviewCase(id, updates);
    setCases((prev) => prev.map((c) => (c.caseID === id ? updatedCase : c)));
    return updatedCase;
  }, []);

  const createCase = useCallback(async (caseData) => {
    if (!caseData || Object.keys(caseData).length === 0) return;
    const newCase = await triageCaseService.createCase(caseData);
    setCases((prev) => [...prev, newCase]);
    return newCase;
  }, []);

  const fetchCaseChangelog = useCallback(async (id) => {
    if (!id) return [];
    return await triageCaseService.getCaseChangelog(id);
  }, []);

  const value = {
    cases,
    fetchCases,
    fetchCaseById,
    updateCase,
    createCase,
    reviewCase,
    fetchCaseChangelog,
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

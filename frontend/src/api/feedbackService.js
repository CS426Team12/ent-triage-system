import apiClient from "./axios";

class FeedbackService {
    async getFeedbackByCaseId(caseId) {
        const res = await apiClient.get(`feedback/case/${caseId}`);
        return res.data;
    }

    async submitFeedback(caseId, feedbackData) {
        const res = await apiClient.post('/feedback', { caseId, ...feedbackData });
        return res.data;
    }   
}

export const feedbackService = new FeedbackService();
export default FeedbackService;
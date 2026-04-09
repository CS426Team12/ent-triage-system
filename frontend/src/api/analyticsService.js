import apiClient from "./axios";

class AnalyticsService {
    async getAIAnalytics(){
        const res = await apiClient.get("/analytics/ai");
        return res.data;
    }
}

export const analyticsService = new AnalyticsService();
export default AnalyticsService;
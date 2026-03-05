import apiClient from "./axios";

class CalendarManagementService {
  async createPhysicianCalendar(physicianID) {
    const res = await apiClient.post(`/calendar/physicians/${physicianID}/create`);
    return res.data; // { calendarID, calendarColor, physicianName }
  }

  async updateCalendarColor(physicianID, color) {
    const res = await apiClient.patch(`/calendar/physicians/${physicianID}/color`, { color });
    return res.data; // { calendarColor, previousColor }
  }
}

export const calendarManagementService = new CalendarManagementService();
export default CalendarManagementService;
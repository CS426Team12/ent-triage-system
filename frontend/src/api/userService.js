import apiClient from "./axios";

class UserService {
  async getAllUsers() {
    const res = await apiClient.get("users/");
    return res.data;
  }

  async getUserById(id) {
    const res = await apiClient.get(`/users/${id}`);
    return res.data;
  }

  async createUser(userData) {
    const res = await apiClient.post("/users", userData);
    return res.data;
  }

  async updateUser(id, updateData) {
    const res = await apiClient.patch(`/users/${id}`, updateData);
    return res.data;
  }
}

export const userService = new UserService();
export default UserService;

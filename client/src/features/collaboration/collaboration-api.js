import { apiRequest } from "../auth/auth-api";

export const collaborationApi = Object.freeze({
  async channels(workspaceId) {
    const response = await apiRequest(`/workspaces/${workspaceId}/channels`);
    return response.data.channels;
  },
  async createChannel(workspaceId, name) {
    const response = await apiRequest(`/workspaces/${workspaceId}/channels`, {
      method: "POST",
      body: JSON.stringify({ name, description: "", projectId: null }),
    });
    return response.data.channel;
  },
  async messages(channelId) {
    const response = await apiRequest(`/channels/${channelId}/messages`);
    return response.data.messages;
  },
  async sendMessage(channelId, content) {
    const response = await apiRequest(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    return response.data.message;
  },
  async comments(taskId) {
    const response = await apiRequest(`/tasks/${taskId}/comments`);
    return response.data.comments;
  },
  async comment(taskId, content) {
    const response = await apiRequest(`/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    return response.data.comment;
  },
  async notifications() {
    const response = await apiRequest("/notifications");
    return response.data.notifications;
  },
  async readAll() {
    await apiRequest("/notifications/read-all", { method: "PATCH" });
  },
});

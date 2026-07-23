import { apiRequest } from "../auth/auth-api";

export const workspaceApi = Object.freeze({
  async listWorkspaces() {
    const response = await apiRequest("/workspaces");
    return response.data.workspaces;
  },

  async createWorkspace(name) {
    const response = await apiRequest("/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    return response.data.workspace;
  },

  async getWorkspaceData(workspaceId) {
    const [projects, members] = await Promise.all([
      apiRequest(
        `/workspaces/${workspaceId}/projects`,
      ),
      apiRequest(
        `/workspaces/${workspaceId}/members`,
      ),
    ]);

    return {
      projects: projects.data.projects,
      members: members.data.members,
    };
  },

  async createProject(workspaceId, project) {
    const response = await apiRequest(
      `/workspaces/${workspaceId}/projects`,
      {
        method: "POST",
        body: JSON.stringify(project),
      },
    );
    return response.data;
  },

  async getBoard(projectId) {
    const response = await apiRequest(
      `/projects/${projectId}/board`,
    );
    return response.data;
  },

  async createTask(boardId, task) {
    const response = await apiRequest(
      `/boards/${boardId}/tasks`,
      {
        method: "POST",
        body: JSON.stringify(task),
      },
    );
    return response.data.task;
  },

  async updateTask(taskId, changes) {
    const response = await apiRequest(
      `/tasks/${taskId}`,
      {
        method: "PATCH",
        body: JSON.stringify(changes),
      },
    );
    return response.data.task;
  },

  async deleteTask(taskId) {
    await apiRequest(`/tasks/${taskId}`, {
      method: "DELETE",
    });
    return taskId;
  },

  async createColumn(boardId, name) {
    const response = await apiRequest(
      `/boards/${boardId}/columns`,
      {
        method: "POST",
        body: JSON.stringify({ name }),
      },
    );
    return response.data.column;
  },

  async inviteMember(workspaceId, invitation) {
    const response = await apiRequest(
      `/workspaces/${workspaceId}/invitations`,
      {
        method: "POST",
        body: JSON.stringify(invitation),
      },
    );
    return response.data;
  },
});

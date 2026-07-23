import {
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";

import { workspaceApi } from "./workspace-api";

const message = (error) =>
  error?.message ?? "The action could not be completed";

export const loadWorkspaces = createAsyncThunk(
  "workspace/list",
  async (_, { rejectWithValue }) => {
    try {
      return await workspaceApi.listWorkspaces();
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
);

export const createWorkspace = createAsyncThunk(
  "workspace/create",
  async (name, { rejectWithValue }) => {
    try {
      return await workspaceApi.createWorkspace(name);
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
);

export const openWorkspace = createAsyncThunk(
  "workspace/open",
  async (workspaceId, { rejectWithValue }) => {
    try {
      return {
        workspaceId,
        ...(await workspaceApi.getWorkspaceData(
          workspaceId,
        )),
      };
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
);

export const createProject = createAsyncThunk(
  "workspace/createProject",
  async (
    { workspaceId, project },
    { rejectWithValue },
  ) => {
    try {
      return await workspaceApi.createProject(
        workspaceId,
        project,
      );
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
);

export const openProject = createAsyncThunk(
  "workspace/openProject",
  async (projectId, { rejectWithValue }) => {
    try {
      return await workspaceApi.getBoard(projectId);
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
);

export const createTask = createAsyncThunk(
  "workspace/createTask",
  async (
    { boardId, task },
    { rejectWithValue },
  ) => {
    try {
      return await workspaceApi.createTask(
        boardId,
        task,
      );
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
);

export const updateTask = createAsyncThunk(
  "workspace/updateTask",
  async (
    { taskId, changes },
    { rejectWithValue },
  ) => {
    try {
      return await workspaceApi.updateTask(
        taskId,
        changes,
      );
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
);

export const deleteTask = createAsyncThunk(
  "workspace/deleteTask",
  async (taskId, { rejectWithValue }) => {
    try {
      return await workspaceApi.deleteTask(taskId);
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
);

export const createColumn = createAsyncThunk(
  "workspace/createColumn",
  async (
    { boardId, name },
    { rejectWithValue },
  ) => {
    try {
      return await workspaceApi.createColumn(
        boardId,
        name,
      );
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
);

export const inviteMember = createAsyncThunk(
  "workspace/invite",
  async (
    { workspaceId, invitation },
    { rejectWithValue },
  ) => {
    try {
      return await workspaceApi.inviteMember(
        workspaceId,
        invitation,
      );
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
);

const initialState = {
  workspaces: [],
  selectedWorkspaceId: null,
  projects: [],
  selectedProjectId: null,
  board: null,
  columns: [],
  tasks: [],
  members: [],
  status: "idle",
  error: null,
  invitationToken: null,
};

const slice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    realtimeTaskCreated(state, action) {
      if (!state.tasks.some((task) => task.id === action.payload.id)) state.tasks.push(action.payload);
    },
    realtimeTaskUpdated(state, action) {
      const index = state.tasks.findIndex((task) => task.id === action.payload.id);
      if (index >= 0) state.tasks[index] = action.payload;
    },
    realtimeTaskDeleted(state, action) {
      state.tasks = state.tasks.filter((task) => task.id !== action.payload);
    },
    clearWorkspaceError(state) {
      state.error = null;
    },
    clearInvitationToken(state) {
      state.invitationToken = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.status = "loading";
      state.error = null;
    };
    const failed = (state, action) => {
      state.status = "idle";
      state.error = action.payload;
    };

    builder
      .addCase(loadWorkspaces.pending, pending)
      .addCase(loadWorkspaces.rejected, failed)
      .addCase(
        loadWorkspaces.fulfilled,
        (state, action) => {
          state.workspaces = action.payload;
          state.status = "idle";
        },
      )
      .addCase(createWorkspace.pending, pending)
      .addCase(createWorkspace.rejected, failed)
      .addCase(
        createWorkspace.fulfilled,
        (state, action) => {
          state.workspaces.push(action.payload);
          state.selectedWorkspaceId =
            action.payload.id;
          state.projects = [];
          state.members = [];
          state.board = null;
          state.columns = [];
          state.tasks = [];
          state.status = "idle";
        },
      )
      .addCase(openWorkspace.pending, pending)
      .addCase(openWorkspace.rejected, failed)
      .addCase(
        openWorkspace.fulfilled,
        (state, action) => {
          state.selectedWorkspaceId =
            action.payload.workspaceId;
          state.projects = action.payload.projects;
          state.members = action.payload.members;
          state.selectedProjectId = null;
          state.board = null;
          state.columns = [];
          state.tasks = [];
          state.status = "idle";
        },
      )
      .addCase(createProject.pending, pending)
      .addCase(createProject.rejected, failed)
      .addCase(
        createProject.fulfilled,
        (state, action) => {
          state.projects.unshift(
            action.payload.project,
          );
          state.selectedProjectId =
            action.payload.project.id;
          state.board = action.payload.board;
          state.columns = action.payload.columns;
          state.tasks = [];
          state.status = "idle";
        },
      )
      .addCase(openProject.pending, pending)
      .addCase(openProject.rejected, failed)
      .addCase(
        openProject.fulfilled,
        (state, action) => {
          state.selectedProjectId =
            action.payload.project.id;
          state.board = action.payload.board;
          state.columns = action.payload.columns;
          state.tasks = action.payload.tasks;
          state.status = "idle";
        },
      )
      .addCase(createTask.pending, pending)
      .addCase(createTask.rejected, failed)
      .addCase(
        createTask.fulfilled,
        (state, action) => {
          if (
            !state.tasks.some(
              (task) =>
                task.id === action.payload.id,
            )
          ) {
            state.tasks.push(action.payload);
          }
          state.status = "idle";
        },
      )
      .addCase(updateTask.pending, pending)
      .addCase(updateTask.rejected, failed)
      .addCase(
        updateTask.fulfilled,
        (state, action) => {
          const index = state.tasks.findIndex(
            (task) =>
              task.id === action.payload.id,
          );
          if (index >= 0) {
            state.tasks[index] = action.payload;
          }
          state.status = "idle";
        },
      )
      .addCase(deleteTask.pending, pending)
      .addCase(deleteTask.rejected, failed)
      .addCase(
        deleteTask.fulfilled,
        (state, action) => {
          state.tasks = state.tasks.filter(
            (task) => task.id !== action.payload,
          );
          state.status = "idle";
        },
      )
      .addCase(createColumn.pending, pending)
      .addCase(createColumn.rejected, failed)
      .addCase(
        createColumn.fulfilled,
        (state, action) => {
          state.columns.push(action.payload);
          state.status = "idle";
        },
      )
      .addCase(inviteMember.pending, pending)
      .addCase(inviteMember.rejected, failed)
      .addCase(
        inviteMember.fulfilled,
        (state, action) => {
          state.invitationToken =
            action.payload.token;
          state.status = "idle";
        },
      );
  },
});

export const {
  realtimeTaskCreated,
  realtimeTaskUpdated,
  realtimeTaskDeleted,
  clearWorkspaceError,
  clearInvitationToken,
} = slice.actions;

export default slice.reducer;

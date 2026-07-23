import {
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";

import { authApi } from "./auth-api";

function getErrorMessage(error) {
  return (
    error?.message ??
    "Something went wrong. Please try again."
  );
}

export const initializeAuth = createAsyncThunk(
  "auth/initialize",
  async (_, { rejectWithValue }) => {
    try {
      return await authApi.getCurrentUser();
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error),
      );
    }
  },
);

export const registerUser = createAsyncThunk(
  "auth/register",
  async (credentials, { rejectWithValue }) => {
    try {
      return await authApi.register(credentials);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error),
      );
    }
  },
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      return await authApi.login(credentials);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error),
      );
    }
  },
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logout();
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error),
      );
    }
  },
);

function createSettingsThunk(type, update) {
  return createAsyncThunk(
    type,
    async (values, { rejectWithValue }) => {
      try {
        return await update(values);
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );
}

export const updateProfile = createSettingsThunk(
  "auth/updateProfile",
  authApi.updateProfile,
);

export const updatePersonalSettings =
  createSettingsThunk(
    "auth/updatePersonalSettings",
    authApi.updatePersonalSettings,
  );

export const updatePrivacySettings =
  createSettingsThunk(
    "auth/updatePrivacySettings",
    authApi.updatePrivacySettings,
  );

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    initialized: false,
    status: "idle",
    error: null,
    settingsStatus: "idle",
    settingsError: null,
  },
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.status = "loading";
      })
      .addCase(
        initializeAuth.fulfilled,
        (state, action) => {
          state.user = action.payload;
          state.initialized = true;
          state.status = "idle";
          state.error = null;
        },
      )
      .addCase(
        initializeAuth.rejected,
        (state) => {
          state.user = null;
          state.initialized = true;
          state.status = "idle";
          // An anonymous initial visit is expected, not
          // an error that needs to be shown to the user.
          state.error = null;
        },
      )
      .addCase(registerUser.pending, startRequest)
      .addCase(registerUser.fulfilled, finishAuth)
      .addCase(registerUser.rejected, failRequest)
      .addCase(loginUser.pending, startRequest)
      .addCase(loginUser.fulfilled, finishAuth)
      .addCase(loginUser.rejected, failRequest)
      .addCase(logoutUser.pending, startRequest)
      .addCase(
        logoutUser.fulfilled,
        (state) => {
          state.user = null;
          state.status = "idle";
          state.error = null;
        },
      )
      .addCase(logoutUser.rejected, failRequest);

    for (const thunk of [
      updateProfile,
      updatePersonalSettings,
      updatePrivacySettings,
    ]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.settingsStatus = "loading";
          state.settingsError = null;
        })
        .addCase(
          thunk.fulfilled,
          (state, action) => {
            state.user = action.payload;
            state.settingsStatus = "idle";
            state.settingsError = null;
          },
        )
        .addCase(
          thunk.rejected,
          (state, action) => {
            state.settingsStatus = "idle";
            state.settingsError =
              action.payload ??
              "The settings could not be saved.";
          },
        );
    }
  },
});

function startRequest(state) {
  state.status = "loading";
  state.error = null;
}

function finishAuth(state, action) {
  state.user = action.payload;
  state.initialized = true;
  state.status = "idle";
  state.error = null;
}

function failRequest(state, action) {
  state.status = "idle";
  state.error =
    action.payload ??
    "Something went wrong. Please try again.";
}

export const { clearAuthError } =
  authSlice.actions;

export default authSlice.reducer;

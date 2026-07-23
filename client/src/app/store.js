import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/auth-slice";
import workspaceReducer from "../features/workspaces/workspace-slice";
import collaborationReducer from "../features/collaboration/collaboration-slice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspace: workspaceReducer,
    collaboration: collaborationReducer,
  },
});

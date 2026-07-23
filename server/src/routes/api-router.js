import { Router } from "express";

import {
    createBoardRouter,
    createColumnRouter,
} from "./boards.routes.js";
import { createAuthRouter } from "./auth.routes.js";
import { createChannelRouter } from "./channels.routes.js";
import { createConversationRouter } from "./conversations.routes.js";
import { createHealthRouter } from "./health.routes.js";
import { createInvitationRouter } from "./invitations.routes.js";
import { createNotificationRouter } from "./notifications.routes.js";
import { createProjectRouter } from "./projects.routes.js";
import { createSettingsRouter } from "./settings.routes.js";
import { createTaskRouter } from "./tasks.routes.js";
import { createWorkspaceRouter } from "./workspaces.routes.js";

export function createApiRouter(functions) {
    const router = Router();

    router.use(
        "/auth",
        createAuthRouter(functions),
    );
    router.use(
        "/workspaces",
        createWorkspaceRouter(functions),
    );
    router.use(
        "/invitations",
        createInvitationRouter(functions),
    );
    router.use(
        "/projects",
        createProjectRouter(functions),
    );
    router.use(
        "/boards",
        createBoardRouter(functions),
    );
    router.use(
        "/columns",
        createColumnRouter(functions),
    );
    router.use(
        "/tasks",
        createTaskRouter(functions),
    );
    router.use(
        "/channels",
        createChannelRouter(functions),
    );
    router.use(
        "/conversations",
        createConversationRouter(functions),
    );
    router.use(
        "/notifications",
        createNotificationRouter(functions),
    );
    router.use(
        "/settings",
        createSettingsRouter(functions),
    );
    router.use(
        "/health",
        createHealthRouter(functions),
    );

    return router;
}

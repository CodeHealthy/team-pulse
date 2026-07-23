import { Router } from "express";

import { validateRequest } from "../core/middleware/validate-request.js";
import {
    loginSchema,
    registerSchema,
} from "../functions/auth.js";
import {
    boardByProjectSchema,
    columnIdSchema,
    createColumnSchema,
    updateColumnSchema,
} from "../functions/boards.js";
import {
    channelSchema,
    createChannelSchema,
    createCommentSchema,
    createMessageSchema,
    notificationIdSchema,
    taskCommentsSchema,
    workspaceChannelsSchema,
} from "../functions/collaboration.js";
import {
    acceptInvitationSchema,
    createInvitationSchema,
    invitationListSchema,
} from "../functions/invitations.js";
import {
    createProjectSchema,
    projectIdSchema,
    projectListSchema,
    updateProjectSchema,
} from "../functions/projects.js";
import {
    calendarSchema,
    conversationSchema,
    createConversationSchema,
    directMessageSchema,
    taskAttachmentSchema,
    workspaceOnlySchema,
    workspaceQuerySchema,
} from "../functions/phase-three.js";
import {
    createTaskSchema,
    taskIdSchema,
    updateTaskSchema,
} from "../functions/tasks.js";
import {
    createWorkspaceSchema,
    updateMemberRoleSchema,
    updateWorkspaceSchema,
    workspaceIdSchema,
} from "../functions/workspaces.js";

export function createApiRouter({
    authFunctions,
    boardFunctions,
    collaborationFunctions,
    healthFunctions,
    invitationFunctions,
    phaseThreeFunctions,
    projectFunctions,
    taskFunctions,
    workspaceFunctions,
}) {
    const router = Router();

    router.post(
        "/auth/register",
        validateRequest(registerSchema),
        authFunctions.register,
    );
    router.post(
        "/auth/login",
        validateRequest(loginSchema),
        authFunctions.login,
    );
    router.post(
        "/auth/refresh",
        authFunctions.refresh,
    );
    router.get(
        "/auth/me",
        authFunctions.requireAuth,
        authFunctions.currentUser,
    );
    router.post(
        "/auth/logout",
        authFunctions.logout,
    );

    router.get(
        "/workspaces",
        authFunctions.requireAuth,
        workspaceFunctions.list,
    );
    router.post(
        "/workspaces",
        authFunctions.requireAuth,
        validateRequest(createWorkspaceSchema),
        workspaceFunctions.create,
    );
    router.get(
        "/workspaces/:workspaceId",
        authFunctions.requireAuth,
        validateRequest(workspaceIdSchema),
        workspaceFunctions.get,
    );
    router.patch(
        "/workspaces/:workspaceId",
        authFunctions.requireAuth,
        validateRequest(updateWorkspaceSchema),
        workspaceFunctions.update,
    );
    router.get(
        "/workspaces/:workspaceId/members",
        authFunctions.requireAuth,
        validateRequest(workspaceIdSchema),
        workspaceFunctions.listMembers,
    );
    router.patch(
        "/workspaces/:workspaceId/members/:userId",
        authFunctions.requireAuth,
        validateRequest(updateMemberRoleSchema),
        workspaceFunctions.updateMemberRole,
    );

    router.get(
        "/workspaces/:workspaceId/invitations",
        authFunctions.requireAuth,
        validateRequest(invitationListSchema),
        invitationFunctions.list,
    );
    router.post(
        "/workspaces/:workspaceId/invitations",
        authFunctions.requireAuth,
        validateRequest(createInvitationSchema),
        invitationFunctions.create,
    );
    router.post(
        "/invitations/:token/accept",
        authFunctions.requireAuth,
        validateRequest(acceptInvitationSchema),
        invitationFunctions.accept,
    );

    router.get(
        "/workspaces/:workspaceId/projects",
        authFunctions.requireAuth,
        validateRequest(projectListSchema),
        projectFunctions.list,
    );
    router.post(
        "/workspaces/:workspaceId/projects",
        authFunctions.requireAuth,
        validateRequest(createProjectSchema),
        projectFunctions.create,
    );
    router.get(
        "/projects/:projectId",
        authFunctions.requireAuth,
        validateRequest(projectIdSchema),
        projectFunctions.get,
    );
    router.patch(
        "/projects/:projectId",
        authFunctions.requireAuth,
        validateRequest(updateProjectSchema),
        projectFunctions.update,
    );

    router.get(
        "/projects/:projectId/board",
        authFunctions.requireAuth,
        validateRequest(boardByProjectSchema),
        boardFunctions.get,
    );
    router.post(
        "/boards/:boardId/columns",
        authFunctions.requireAuth,
        validateRequest(createColumnSchema),
        boardFunctions.createColumn,
    );
    router.patch(
        "/columns/:columnId",
        authFunctions.requireAuth,
        validateRequest(updateColumnSchema),
        boardFunctions.updateColumn,
    );
    router.delete(
        "/columns/:columnId",
        authFunctions.requireAuth,
        validateRequest(columnIdSchema),
        boardFunctions.removeColumn,
    );

    router.post(
        "/boards/:boardId/tasks",
        authFunctions.requireAuth,
        validateRequest(createTaskSchema),
        taskFunctions.create,
    );
    router.patch(
        "/tasks/:taskId",
        authFunctions.requireAuth,
        validateRequest(updateTaskSchema),
        taskFunctions.update,
    );
    router.delete(
        "/tasks/:taskId",
        authFunctions.requireAuth,
        validateRequest(taskIdSchema),
        taskFunctions.remove,
    );

    router.get("/tasks/:taskId/comments", authFunctions.requireAuth, validateRequest(taskCommentsSchema), collaborationFunctions.listComments);
    router.post("/tasks/:taskId/comments", authFunctions.requireAuth, validateRequest(createCommentSchema), collaborationFunctions.createComment);
    router.get("/workspaces/:workspaceId/channels", authFunctions.requireAuth, validateRequest(workspaceChannelsSchema), collaborationFunctions.listChannels);
    router.post("/workspaces/:workspaceId/channels", authFunctions.requireAuth, validateRequest(createChannelSchema), collaborationFunctions.createChannel);
    router.get("/channels/:channelId/messages", authFunctions.requireAuth, validateRequest(channelSchema), collaborationFunctions.listMessages);
    router.post("/channels/:channelId/messages", authFunctions.requireAuth, validateRequest(createMessageSchema), collaborationFunctions.createMessage);
    router.post("/channels/:channelId/read", authFunctions.requireAuth, validateRequest(channelSchema), collaborationFunctions.markChannelRead);
    router.get("/notifications", authFunctions.requireAuth, collaborationFunctions.listNotifications);
    router.patch("/notifications/:notificationId/read", authFunctions.requireAuth, validateRequest(notificationIdSchema), collaborationFunctions.readNotification);
    router.patch("/notifications/read-all", authFunctions.requireAuth, collaborationFunctions.readAllNotifications);
    router.get("/conversations", authFunctions.requireAuth, phaseThreeFunctions.conversations);
    router.post("/conversations", authFunctions.requireAuth, validateRequest(createConversationSchema), phaseThreeFunctions.createConversation);
    router.get("/conversations/:conversationId/messages", authFunctions.requireAuth, validateRequest(conversationSchema), phaseThreeFunctions.messages);
    router.post("/conversations/:conversationId/messages", authFunctions.requireAuth, validateRequest(directMessageSchema), phaseThreeFunctions.send);
    router.get("/workspaces/:workspaceId/search", authFunctions.requireAuth, validateRequest(workspaceQuerySchema), phaseThreeFunctions.search);
    router.get("/workspaces/:workspaceId/calendar", authFunctions.requireAuth, validateRequest(calendarSchema), phaseThreeFunctions.calendar);
    router.get("/workspaces/:workspaceId/analytics", authFunctions.requireAuth, validateRequest(workspaceOnlySchema), phaseThreeFunctions.analytics);
    router.get("/workspaces/:workspaceId/activity", authFunctions.requireAuth, validateRequest(workspaceOnlySchema), phaseThreeFunctions.activity);
    router.get("/tasks/:taskId/attachments", authFunctions.requireAuth, validateRequest(taskAttachmentSchema), phaseThreeFunctions.attachments);
    router.post("/tasks/:taskId/attachments", authFunctions.requireAuth, phaseThreeFunctions.upload, phaseThreeFunctions.saveAttachment);

    router.get(
        "/health",
        healthFunctions.checkHealth,
    );

    return router;
}

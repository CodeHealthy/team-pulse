import { Router } from "express";

import { validateRequest } from "../core/middleware/validate-request.js";
import {
    createChannelSchema,
    workspaceChannelsSchema,
} from "../functions/collaboration.js";
import {
    createInvitationSchema,
    invitationListSchema,
} from "../functions/invitations.js";
import {
    createProjectSchema,
    projectListSchema,
} from "../functions/projects.js";
import {
    createWorkspaceSchema,
    updateMemberRoleSchema,
    updateWorkspaceSchema,
    workspaceIdSchema,
} from "../functions/workspaces.js";
import { calendarSchema } from "../functions/workspace-calendar.js";
import { workspaceOnlySchema } from "../functions/workspace-common.js";
import { workspaceQuerySchema } from "../functions/workspace-search.js";

export function createWorkspaceRouter({
    authFunctions,
    workspaceFunctions,
    collaborationFunctions,
    invitationFunctions,
    projectFunctions,
    searchFunctions,
    calendarFunctions,
    analyticsFunctions,
    activityFunctions,
}) {
    const router = Router();

    router.use(authFunctions.requireAuth);

    router.get("/", workspaceFunctions.list);
    router.post(
        "/",
        validateRequest(createWorkspaceSchema),
        workspaceFunctions.create,
    );
    router.get(
        "/:workspaceId",
        validateRequest(workspaceIdSchema),
        workspaceFunctions.get,
    );
    router.patch(
        "/:workspaceId",
        validateRequest(updateWorkspaceSchema),
        workspaceFunctions.update,
    );
    router.get(
        "/:workspaceId/members",
        validateRequest(workspaceIdSchema),
        workspaceFunctions.listMembers,
    );
    router.patch(
        "/:workspaceId/members/:userId",
        validateRequest(updateMemberRoleSchema),
        workspaceFunctions.updateMemberRole,
    );

    router.get(
        "/:workspaceId/invitations",
        validateRequest(invitationListSchema),
        invitationFunctions.list,
    );
    router.post(
        "/:workspaceId/invitations",
        validateRequest(createInvitationSchema),
        invitationFunctions.create,
    );
    router.get(
        "/:workspaceId/projects",
        validateRequest(projectListSchema),
        projectFunctions.list,
    );
    router.post(
        "/:workspaceId/projects",
        validateRequest(createProjectSchema),
        projectFunctions.create,
    );
    router.get(
        "/:workspaceId/channels",
        validateRequest(workspaceChannelsSchema),
        collaborationFunctions.listChannels,
    );
    router.post(
        "/:workspaceId/channels",
        validateRequest(createChannelSchema),
        collaborationFunctions.createChannel,
    );

    router.get(
        "/:workspaceId/search",
        validateRequest(workspaceQuerySchema),
        searchFunctions.searchWorkspace,
    );
    router.get(
        "/:workspaceId/calendar",
        validateRequest(calendarSchema),
        calendarFunctions.getWorkspaceCalendar,
    );
    router.get(
        "/:workspaceId/analytics",
        validateRequest(workspaceOnlySchema),
        analyticsFunctions.getWorkspaceAnalytics,
    );
    router.get(
        "/:workspaceId/activity",
        validateRequest(workspaceOnlySchema),
        activityFunctions.listWorkspaceActivity,
    );

    return router;
}

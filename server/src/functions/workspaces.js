import { randomBytes } from "node:crypto";
import { z } from "zod";

import { WORKSPACE_ROLES } from "@teampulse/contracts/domain";

import { AppError } from "../core/errors/app-error.js";
import { HTTP_STATUS } from "../core/http/http-status.js";
import {
    notFound,
    requireWorkspaceAccess,
} from "./access.js";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const params = z.object({ workspaceId: id });

export const createWorkspaceSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).max(80),
    }),
    params: z.object({}),
    query: z.object({}),
});

export const workspaceIdSchema = z.object({
    body: z.object({}),
    params,
    query: z.object({}),
});

export const updateWorkspaceSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).max(80),
    }),
    params,
    query: z.object({}),
});

export const updateMemberRoleSchema = z.object({
    body: z.object({
        role: z.enum([
            WORKSPACE_ROLES.ADMIN,
            WORKSPACE_ROLES.MEMBER,
        ]),
    }),
    params: z.object({
        workspaceId: id,
        userId: id,
    }),
    query: z.object({}),
});

function slugify(name) {
    const base = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);

    return `${base || "workspace"}-${randomBytes(3).toString("hex")}`;
}

export function createWorkspaceFunctions({
    WorkspaceModel,
    WorkspaceMemberModel,
}) {
    async function list(request, response, next) {
        try {
            const memberships =
                await WorkspaceMemberModel.listForUser(
                    request.auth.user.id,
                );
            const workspaces =
                await WorkspaceModel.findMany(
                    memberships.map(
                        (membership) =>
                            membership.workspaceId,
                    ),
                );
            const roleByWorkspace = new Map(
                memberships.map((membership) => [
                    membership.workspaceId,
                    membership.role,
                ]),
            );

            return response.json({
                success: true,
                data: {
                    workspaces: workspaces.map(
                        (workspace) => ({
                            ...workspace,
                            role: roleByWorkspace.get(
                                workspace.id,
                            ),
                        }),
                    ),
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function create(request, response, next) {
        try {
            const workspace =
                await WorkspaceModel.create({
                    name: request.validated.body.name,
                    slug: slugify(
                        request.validated.body.name,
                    ),
                    createdBy:
                        request.auth.user.id,
                });

            try {
                await WorkspaceMemberModel.create({
                    workspaceId: workspace.id,
                    userId: request.auth.user.id,
                    role: WORKSPACE_ROLES.OWNER,
                });
            } catch (error) {
                await WorkspaceModel.remove(
                    workspace.id,
                );
                throw error;
            }

            return response
                .status(HTTP_STATUS.CREATED)
                .json({
                    success: true,
                    data: {
                        workspace: {
                            ...workspace,
                            role: WORKSPACE_ROLES.OWNER,
                        },
                    },
                });
        } catch (error) {
            return next(error);
        }
    }

    async function get(request, response, next) {
        try {
            const { workspaceId } =
                request.validated.params;
            const membership =
                await requireWorkspaceAccess({
                    WorkspaceMemberModel,
                    workspaceId,
                    userId: request.auth.user.id,
                });
            const workspace =
                await WorkspaceModel.findById(
                    workspaceId,
                );

            if (!workspace) {
                throw notFound("Workspace");
            }

            return response.json({
                success: true,
                data: {
                    workspace: {
                        ...workspace,
                        role: membership.role,
                    },
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function update(request, response, next) {
        try {
            const { workspaceId } =
                request.validated.params;

            await requireWorkspaceAccess({
                WorkspaceMemberModel,
                workspaceId,
                userId: request.auth.user.id,
                roles: [
                    WORKSPACE_ROLES.OWNER,
                    WORKSPACE_ROLES.ADMIN,
                ],
            });

            const workspace =
                await WorkspaceModel.update(
                    workspaceId,
                    request.validated.body,
                );

            if (!workspace) {
                throw notFound("Workspace");
            }

            return response.json({
                success: true,
                data: { workspace },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function listMembers(
        request,
        response,
        next,
    ) {
        try {
            const { workspaceId } =
                request.validated.params;

            await requireWorkspaceAccess({
                WorkspaceMemberModel,
                workspaceId,
                userId: request.auth.user.id,
            });

            return response.json({
                success: true,
                data: {
                    members:
                        await WorkspaceMemberModel.listMembers(
                            workspaceId,
                        ),
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function updateMemberRole(
        request,
        response,
        next,
    ) {
        try {
            const { workspaceId, userId } =
                request.validated.params;

            await requireWorkspaceAccess({
                WorkspaceMemberModel,
                workspaceId,
                userId: request.auth.user.id,
                roles: [WORKSPACE_ROLES.OWNER],
            });

            if (userId === request.auth.user.id) {
                throw new AppError({
                    message:
                        "The workspace owner role cannot be changed here",
                    statusCode:
                        HTTP_STATUS.CONFLICT,
                    code: "OWNER_ROLE_PROTECTED",
                });
            }

            const membership =
                await WorkspaceMemberModel.updateRole(
                    workspaceId,
                    userId,
                    request.validated.body.role,
                );

            if (!membership) {
                throw notFound("Workspace member");
            }

            return response.json({
                success: true,
                data: { membership },
            });
        } catch (error) {
            return next(error);
        }
    }

    return Object.freeze({
        list,
        create,
        get,
        update,
        listMembers,
        updateMemberRole,
    });
}

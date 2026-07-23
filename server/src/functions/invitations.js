import {
    createHash,
    randomBytes,
} from "node:crypto";
import { z } from "zod";

import { WORKSPACE_ROLES } from "@teampulse/contracts/domain";

import { AppError } from "../core/errors/app-error.js";
import { HTTP_STATUS } from "../core/http/http-status.js";
import { requireWorkspaceAccess } from "./access.js";

const id = z.string().regex(/^[a-f\d]{24}$/i);

export const createInvitationSchema = z.object({
    body: z.object({
        email: z.string().trim().email().toLowerCase(),
        role: z
            .enum([
                WORKSPACE_ROLES.ADMIN,
                WORKSPACE_ROLES.MEMBER,
            ])
            .default(WORKSPACE_ROLES.MEMBER),
    }),
    params: z.object({ workspaceId: id }),
    query: z.object({}),
});

export const invitationListSchema = z.object({
    body: z.object({}),
    params: z.object({ workspaceId: id }),
    query: z.object({}),
});

export const acceptInvitationSchema = z.object({
    body: z.object({}),
    params: z.object({
        token: z.string().min(32).max(256),
    }),
    query: z.object({}),
});

function hashToken(token) {
    return createHash("sha256")
        .update(token)
        .digest("hex");
}

export function createInvitationFunctions({
    InvitationModel,
    WorkspaceMemberModel,
    jobService,
}) {
    async function create(request, response, next) {
        try {
            const { workspaceId } =
                request.validated.params;
            const { email, role } =
                request.validated.body;

            await requireWorkspaceAccess({
                WorkspaceMemberModel,
                workspaceId,
                userId: request.auth.user.id,
                roles: [
                    WORKSPACE_ROLES.OWNER,
                    WORKSPACE_ROLES.ADMIN,
                ],
            });

            const token =
                randomBytes(32).toString("hex");
            const invitation =
                await InvitationModel.create({
                    workspaceId,
                    email,
                    role,
                    tokenHash: hashToken(token),
                    invitedBy:
                        request.auth.user.id,
                    expiresAt: new Date(
                        Date.now() +
                            7 * 24 * 60 * 60 * 1000,
                    ),
                });

            try {
                await jobService.enqueueInvitation({
                    email,
                    token,
                });
            } catch (error) {
                // The invitation link is still valid when the
                // optional email delivery service is unavailable.
                console.error(
                    "Invitation email could not be queued:",
                    error,
                );
            }

            return response
                .status(HTTP_STATUS.CREATED)
                .json({
                    success: true,
                    data: {
                        invitation,
                        token,
                    },
                });
        } catch (error) {
            return next(error);
        }
    }

    async function list(request, response, next) {
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

            return response.json({
                success: true,
                data: {
                    invitations:
                        await InvitationModel.list(
                            workspaceId,
                        ),
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function accept(request, response, next) {
        try {
            const invitation =
                await InvitationModel.findPendingByHash(
                    hashToken(
                        request.validated.params.token,
                    ),
                );

            if (!invitation) {
                throw new AppError({
                    message:
                        "This invitation is invalid or has expired",
                    statusCode:
                        HTTP_STATUS.NOT_FOUND,
                    code: "INVITATION_NOT_FOUND",
                });
            }

            if (
                invitation.email !==
                request.auth.user.email
            ) {
                throw new AppError({
                    message:
                        "This invitation belongs to another email address",
                    statusCode:
                        HTTP_STATUS.FORBIDDEN,
                    code: "INVITATION_EMAIL_MISMATCH",
                });
            }

            let membership =
                await WorkspaceMemberModel.find(
                    invitation.workspaceId,
                    request.auth.user.id,
                );

            if (!membership) {
                membership =
                    await WorkspaceMemberModel.create({
                        workspaceId:
                            invitation.workspaceId,
                        userId:
                            request.auth.user.id,
                        role: invitation.role,
                    });
            }

            await InvitationModel.accept(
                invitation.id,
            );

            return response.json({
                success: true,
                data: { membership },
            });
        } catch (error) {
            return next(error);
        }
    }

    return Object.freeze({
        create,
        list,
        accept,
    });
}

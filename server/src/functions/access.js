import { AppError } from "../core/errors/app-error.js";
import { HTTP_STATUS } from "../core/http/http-status.js";

export function notFound(entity) {
    return new AppError({
        message: `${entity} was not found`,
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: `${entity.toUpperCase().replaceAll(" ", "_")}_NOT_FOUND`,
    });
}

export async function requireWorkspaceAccess({
    WorkspaceMemberModel,
    workspaceId,
    userId,
    roles,
}) {
    const membership =
        await WorkspaceMemberModel.find(
            workspaceId,
            userId,
        );

    if (!membership) {
        throw new AppError({
            message:
                "You do not have access to this workspace",
            statusCode: HTTP_STATUS.FORBIDDEN,
            code: "WORKSPACE_ACCESS_DENIED",
        });
    }

    if (roles && !roles.includes(membership.role)) {
        throw new AppError({
            message:
                "Your workspace role does not allow this action",
            statusCode: HTTP_STATUS.FORBIDDEN,
            code: "WORKSPACE_PERMISSION_DENIED",
        });
    }

    return membership;
}

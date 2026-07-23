import { requireWorkspaceAccess } from "./access.js";

export function createActivityFunctions({
    ActivityLogRepository,
    WorkspaceMemberRepository,
}) {
    async function listWorkspaceActivity(
        request,
        response,
        next,
    ) {
        try {
            const { workspaceId } =
                request.validated.params;

            await requireWorkspaceAccess({
                WorkspaceMemberRepository,
                workspaceId,
                userId: request.auth.user.id,
            });

            return response.json({
                success: true,
                data: {
                    activity:
                        await ActivityLogRepository.listByWorkspaceId(
                            workspaceId,
                        ),
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    return Object.freeze({
        listWorkspaceActivity,
    });
}

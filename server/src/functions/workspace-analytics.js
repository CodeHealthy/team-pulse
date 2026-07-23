import { requireWorkspaceAccess } from "./access.js";

export function createAnalyticsFunctions({
    TaskRepository,
    WorkspaceMemberRepository,
}) {
    async function getWorkspaceAnalytics(
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
                data: await TaskRepository.getAnalyticsByWorkspaceId(
                    workspaceId,
                ),
            });
        } catch (error) {
            return next(error);
        }
    }

    return Object.freeze({
        getWorkspaceAnalytics,
    });
}

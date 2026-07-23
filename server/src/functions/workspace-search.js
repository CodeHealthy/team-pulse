import { z } from "zod";

import { requireWorkspaceAccess } from "./access.js";

const id = z.string().regex(/^[a-f\d]{24}$/i);

export const workspaceQuerySchema = z.object({
    body: z.object({}),
    params: z.object({
        workspaceId: id,
    }),
    query: z.object({
        q: z.string().trim().min(1).max(100),
    }),
});

export function createSearchFunctions({
    TaskRepository,
    ProjectRepository,
    WorkspaceMemberRepository,
}) {
    async function searchWorkspace(
        request,
        response,
        next,
    ) {
        try {
            const { workspaceId } =
                request.validated.params;
            const { q } = request.validated.query;

            await requireWorkspaceAccess({
                WorkspaceMemberRepository,
                workspaceId,
                userId: request.auth.user.id,
            });

            const [tasks, projects] =
                await Promise.all([
                    TaskRepository.searchByWorkspaceId(
                        workspaceId,
                        q,
                    ),
                    ProjectRepository.searchByWorkspaceId(
                        workspaceId,
                        q,
                    ),
                ]);

            return response.json({
                success: true,
                data: { tasks, projects },
            });
        } catch (error) {
            return next(error);
        }
    }

    return Object.freeze({
        searchWorkspace,
    });
}

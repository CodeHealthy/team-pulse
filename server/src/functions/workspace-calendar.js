import { z } from "zod";

import { requireWorkspaceAccess } from "./access.js";

const id = z.string().regex(/^[a-f\d]{24}$/i);

export const calendarSchema = z.object({
    body: z.object({}),
    params: z.object({
        workspaceId: id,
    }),
    query: z.object({
        from: z.coerce.date(),
        to: z.coerce.date(),
    }),
});

export function createCalendarFunctions({
    TaskRepository,
    WorkspaceMemberRepository,
}) {
    async function getWorkspaceCalendar(
        request,
        response,
        next,
    ) {
        try {
            const { workspaceId } =
                request.validated.params;
            const { from, to } =
                request.validated.query;

            await requireWorkspaceAccess({
                WorkspaceMemberRepository,
                workspaceId,
                userId: request.auth.user.id,
            });

            return response.json({
                success: true,
                data: {
                    tasks: await TaskRepository.listCalendarByWorkspaceId(
                        workspaceId,
                        from,
                        to,
                    ),
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    return Object.freeze({
        getWorkspaceCalendar,
    });
}

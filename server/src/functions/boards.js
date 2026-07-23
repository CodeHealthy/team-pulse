import { z } from "zod";

import { HTTP_STATUS } from "../core/http/http-status.js";
import {
    notFound,
    requireWorkspaceAccess,
} from "./access.js";

const id = z.string().regex(/^[a-f\d]{24}$/i);

export const boardByProjectSchema = z.object({
    body: z.object({}),
    params: z.object({ projectId: id }),
    query: z.object({}),
});

export const createColumnSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(60),
    }),
    params: z.object({ boardId: id }),
    query: z.object({}),
});

export const updateColumnSchema = z.object({
    body: z
        .object({
            name: z
                .string()
                .trim()
                .min(1)
                .max(60)
                .optional(),
            position: z
                .number()
                .int()
                .min(0)
                .optional(),
        })
        .refine(
            (body) =>
                Object.keys(body).length > 0,
        ),
    params: z.object({ columnId: id }),
    query: z.object({}),
});

export const columnIdSchema = z.object({
    body: z.object({}),
    params: z.object({ columnId: id }),
    query: z.object({}),
});

export function createBoardFunctions({
    ProjectRepository,
    BoardRepository,
    BoardColumnRepository,
    TaskRepository,
    WorkspaceMemberRepository,
}) {
    async function accessWorkspace(
        workspaceId,
        userId,
    ) {
        return requireWorkspaceAccess({
            WorkspaceMemberRepository,
            workspaceId,
            userId,
        });
    }

    async function get(request, response, next) {
        try {
            const project =
                await ProjectRepository.findById(
                    request.validated.params
                        .projectId,
                );

            if (!project) {
                throw notFound("Project");
            }

            await accessWorkspace(
                project.workspaceId,
                request.auth.user.id,
            );

            const board =
                await BoardRepository.findByProjectId(
                    project.id,
                );

            if (!board) {
                throw notFound("Board");
            }

            const [columns, tasks] =
                await Promise.all([
                    BoardColumnRepository.listByBoardId(
                        board.id,
                    ),
                    TaskRepository.listByBoardId(board.id),
                ]);

            return response.json({
                success: true,
                data: {
                    project,
                    board,
                    columns,
                    tasks,
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function createColumn(
        request,
        response,
        next,
    ) {
        try {
            const board =
                await BoardRepository.findById(
                    request.validated.params
                        .boardId,
                );

            if (!board) {
                throw notFound("Board");
            }

            await accessWorkspace(
                board.workspaceId,
                request.auth.user.id,
            );

            const column =
                await BoardColumnRepository.create({
                    workspaceId:
                        board.workspaceId,
                    projectId: board.projectId,
                    boardId: board.id,
                    name: request.validated.body
                        .name,
                    position:
                        await BoardColumnRepository.getNextPosition(
                            board.id,
                        ),
                });

            return response
                .status(HTTP_STATUS.CREATED)
                .json({
                    success: true,
                    data: { column },
                });
        } catch (error) {
            return next(error);
        }
    }

    async function updateColumn(
        request,
        response,
        next,
    ) {
        try {
            const { columnId } =
                request.validated.params;
            const existing =
                await BoardColumnRepository.findById(
                    columnId,
                );

            if (!existing) {
                throw notFound("Board column");
            }

            await accessWorkspace(
                existing.workspaceId,
                request.auth.user.id,
            );

            return response.json({
                success: true,
                data: {
                    column:
                        await BoardColumnRepository.updateById(
                            columnId,
                            request.validated.body,
                        ),
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function removeColumn(
        request,
        response,
        next,
    ) {
        try {
            const { columnId } =
                request.validated.params;
            const column =
                await BoardColumnRepository.findById(
                    columnId,
                );

            if (!column) {
                throw notFound("Board column");
            }

            await accessWorkspace(
                column.workspaceId,
                request.auth.user.id,
            );

            await TaskRepository.deleteByColumnId(
                columnId,
            );
            await BoardColumnRepository.deleteById(
                columnId,
            );

            return response
                .status(HTTP_STATUS.NO_CONTENT)
                .send();
        } catch (error) {
            return next(error);
        }
    }

    return Object.freeze({
        get,
        createColumn,
        updateColumn,
        removeColumn,
    });
}

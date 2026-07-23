import { z } from "zod";

import { TASK_PRIORITIES } from "@teampulse/contracts/domain";
import { SOCKET_EVENTS } from "@teampulse/contracts/socket-events";

import { HTTP_STATUS } from "../core/http/http-status.js";
import {
    notFound,
    requireWorkspaceAccess,
} from "./access.js";

const id = z.string().regex(/^[a-f\d]{24}$/i);
const priority = z.enum([
    TASK_PRIORITIES.LOW,
    TASK_PRIORITIES.MEDIUM,
    TASK_PRIORITIES.HIGH,
    TASK_PRIORITIES.URGENT,
]);
const dueDate = z
    .string()
    .datetime()
    .nullable()
    .transform((value) =>
        value ? new Date(value) : null,
    );

export const createTaskSchema = z.object({
    body: z.object({
        columnId: id,
        title: z.string().trim().min(1).max(160),
        description: z
            .string()
            .trim()
            .max(5000)
            .default(""),
        priority: priority.default(
            TASK_PRIORITIES.MEDIUM,
        ),
        labels: z
            .array(
                z.string().trim().min(1).max(30),
            )
            .max(10)
            .default([]),
        assigneeIds: z
            .array(id)
            .max(20)
            .default([]),
        dueDate: dueDate.optional().default(null),
    }),
    params: z.object({ boardId: id }),
    query: z.object({}),
});

export const updateTaskSchema = z.object({
    body: z
        .object({
            columnId: id.optional(),
            title: z
                .string()
                .trim()
                .min(1)
                .max(160)
                .optional(),
            description: z
                .string()
                .trim()
                .max(5000)
                .optional(),
            priority: priority.optional(),
            labels: z
                .array(
                    z
                        .string()
                        .trim()
                        .min(1)
                        .max(30),
                )
                .max(10)
                .optional(),
            assigneeIds: z
                .array(id)
                .max(20)
                .optional(),
            dueDate: dueDate.optional(),
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
    params: z.object({ taskId: id }),
    query: z.object({}),
});

export const taskIdSchema = z.object({
    body: z.object({}),
    params: z.object({ taskId: id }),
    query: z.object({}),
});

export function createTaskFunctions({
    TaskRepository,
    BoardRepository,
    BoardColumnRepository,
    ActivityLogRepository,
    NotificationRepository,
    WorkspaceMemberRepository,
    bus,
}) {
    async function validateAssignees(
        workspaceId,
        assigneeIds,
    ) {
        await Promise.all(
            assigneeIds.map(async (userId) => {
                await requireWorkspaceAccess({
                    WorkspaceMemberRepository,
                    workspaceId,
                    userId,
                });
            }),
        );
    }

    async function create(request, response, next) {
        try {
            const { boardId } =
                request.validated.params;
            const board =
                await BoardRepository.findById(boardId);

            if (!board) {
                throw notFound("Board");
            }

            await requireWorkspaceAccess({
                WorkspaceMemberRepository,
                workspaceId: board.workspaceId,
                userId: request.auth.user.id,
            });

            const column =
                await BoardColumnRepository.findById(
                    request.validated.body
                        .columnId,
                );

            if (
                !column ||
                column.boardId !== board.id
            ) {
                throw notFound("Board column");
            }

            await validateAssignees(
                board.workspaceId,
                request.validated.body
                    .assigneeIds,
            );

            const task = await TaskRepository.create({
                ...request.validated.body,
                workspaceId: board.workspaceId,
                projectId: board.projectId,
                boardId: board.id,
                position:
                    await TaskRepository.getNextPosition(
                        column.id,
                    ),
                createdBy:
                    request.auth.user.id,
            });

            bus.emitWorkspace(
                task.workspaceId,
                SOCKET_EVENTS.TASK.CREATED,
                { task },
            );
            await ActivityLogRepository.create({
                workspaceId: task.workspaceId,
                actorId: request.auth.user.id,
                action: "task.created",
                entityType: "task",
                entityId: task.id,
                metadata: { title: task.title },
            });
            for (const userId of task.assigneeIds) {
                if (userId === request.auth.user.id) continue;
                const notification =
                    await NotificationRepository.create({
                        userId,
                        workspaceId: task.workspaceId,
                        type: "task_assigned",
                        title: "Task assigned",
                        body: `${request.auth.user.name} assigned you ${task.title}`,
                        entityType: "task",
                        entityId: task.id,
                    });
                bus.emitUser(
                    userId,
                    SOCKET_EVENTS.NOTIFICATION.CREATED,
                    { notification },
                );
            }

            return response
                .status(HTTP_STATUS.CREATED)
                .json({
                    success: true,
                    data: { task },
                });
        } catch (error) {
            return next(error);
        }
    }

    async function update(request, response, next) {
        try {
            const { taskId } =
                request.validated.params;
            const task =
                await TaskRepository.findById(taskId);

            if (!task) {
                throw notFound("Task");
            }

            await requireWorkspaceAccess({
                WorkspaceMemberRepository,
                workspaceId: task.workspaceId,
                userId: request.auth.user.id,
            });

            if (
                request.validated.body.columnId
            ) {
                const column =
                    await BoardColumnRepository.findById(
                        request.validated.body
                            .columnId,
                    );

                if (
                    !column ||
                    column.boardId !== task.boardId
                ) {
                    throw notFound(
                        "Board column",
                    );
                }
            }

            if (
                request.validated.body
                    .assigneeIds
            ) {
                await validateAssignees(
                    task.workspaceId,
                    request.validated.body
                        .assigneeIds,
                );
            }

            const updated = await TaskRepository.updateById(
                taskId,
                request.validated.body,
            );

            bus.emitWorkspace(
                updated.workspaceId,
                SOCKET_EVENTS.TASK.UPDATED,
                { task: updated },
            );
            await ActivityLogRepository.create({
                workspaceId: updated.workspaceId,
                actorId: request.auth.user.id,
                action: "task.updated",
                entityType: "task",
                entityId: updated.id,
                metadata: request.validated.body,
            });
            const previousAssignees = new Set(
                task.assigneeIds,
            );
            for (const userId of updated.assigneeIds) {
                if (
                    userId === request.auth.user.id ||
                    previousAssignees.has(userId)
                ) continue;
                const notification =
                    await NotificationRepository.create({
                        userId,
                        workspaceId: updated.workspaceId,
                        type: "task_assigned",
                        title: "Task assigned",
                        body: `${request.auth.user.name} assigned you ${updated.title}`,
                        entityType: "task",
                        entityId: updated.id,
                    });
                bus.emitUser(
                    userId,
                    SOCKET_EVENTS.NOTIFICATION.CREATED,
                    { notification },
                );
            }

            return response.json({
                success: true,
                data: { task: updated },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function remove(request, response, next) {
        try {
            const task =
                await TaskRepository.findById(
                    request.validated.params
                        .taskId,
                );

            if (!task) {
                throw notFound("Task");
            }

            await requireWorkspaceAccess({
                WorkspaceMemberRepository,
                workspaceId: task.workspaceId,
                userId: request.auth.user.id,
            });
            await TaskRepository.deleteById(task.id);
            bus.emitWorkspace(
                task.workspaceId,
                SOCKET_EVENTS.TASK.DELETED,
                { taskId: task.id },
            );
            await ActivityLogRepository.create({
                workspaceId: task.workspaceId,
                actorId: request.auth.user.id,
                action: "task.deleted",
                entityType: "task",
                entityId: task.id,
                metadata: { title: task.title },
            });

            return response
                .status(HTTP_STATUS.NO_CONTENT)
                .send();
        } catch (error) {
            return next(error);
        }
    }

    return Object.freeze({
        create,
        update,
        remove,
    });
}

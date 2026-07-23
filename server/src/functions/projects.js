import { z } from "zod";

import { PROJECT_STATUSES } from "@teampulse/contracts/domain";

import { HTTP_STATUS } from "../core/http/http-status.js";
import {
    notFound,
    requireWorkspaceAccess,
} from "./access.js";

const id = z.string().regex(/^[a-f\d]{24}$/i);

export const projectListSchema = z.object({
    body: z.object({}),
    params: z.object({ workspaceId: id }),
    query: z.object({}),
});

export const createProjectSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).max(100),
        description: z
            .string()
            .trim()
            .max(1000)
            .default(""),
        color: z
            .string()
            .regex(/^#[0-9a-f]{6}$/i)
            .default("#4F7CFF"),
    }),
    params: z.object({ workspaceId: id }),
    query: z.object({}),
});

export const projectIdSchema = z.object({
    body: z.object({}),
    params: z.object({ projectId: id }),
    query: z.object({}),
});

export const updateProjectSchema = z.object({
    body: z
        .object({
            name: z
                .string()
                .trim()
                .min(2)
                .max(100)
                .optional(),
            description: z
                .string()
                .trim()
                .max(1000)
                .optional(),
            color: z
                .string()
                .regex(/^#[0-9a-f]{6}$/i)
                .optional(),
            status: z
                .enum([
                    PROJECT_STATUSES.ACTIVE,
                    PROJECT_STATUSES.ARCHIVED,
                ])
                .optional(),
        })
        .refine(
            (body) =>
                Object.keys(body).length > 0,
            "Provide at least one field",
        ),
    params: z.object({ projectId: id }),
    query: z.object({}),
});

export function createProjectFunctions({
    ProjectModel,
    BoardModel,
    BoardColumnModel,
    WorkspaceMemberModel,
}) {
    async function requireProject(
        projectId,
        userId,
    ) {
        const project =
            await ProjectModel.findById(projectId);

        if (!project) {
            throw notFound("Project");
        }

        await requireWorkspaceAccess({
            WorkspaceMemberModel,
            workspaceId: project.workspaceId,
            userId,
        });

        return project;
    }

    async function list(request, response, next) {
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
                    projects:
                        await ProjectModel.list(
                            workspaceId,
                        ),
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function create(request, response, next) {
        try {
            const { workspaceId } =
                request.validated.params;

            await requireWorkspaceAccess({
                WorkspaceMemberModel,
                workspaceId,
                userId: request.auth.user.id,
            });

            const project =
                await ProjectModel.create({
                    ...request.validated.body,
                    workspaceId,
                    createdBy:
                        request.auth.user.id,
                });
            const board = await BoardModel.create({
                workspaceId,
                projectId: project.id,
                name: "Main board",
            });
            const columnNames = [
                "Backlog",
                "In progress",
                "Review",
                "Done",
            ];
            const columns =
                await BoardColumnModel.createMany(
                    columnNames.map(
                        (name, position) => ({
                            workspaceId,
                            projectId: project.id,
                            boardId: board.id,
                            name,
                            position,
                        }),
                    ),
                );

            return response
                .status(HTTP_STATUS.CREATED)
                .json({
                    success: true,
                    data: {
                        project,
                        board,
                        columns,
                    },
                });
        } catch (error) {
            return next(error);
        }
    }

    async function get(request, response, next) {
        try {
            const project = await requireProject(
                request.validated.params
                    .projectId,
                request.auth.user.id,
            );

            return response.json({
                success: true,
                data: { project },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function update(request, response, next) {
        try {
            const { projectId } =
                request.validated.params;

            await requireProject(
                projectId,
                request.auth.user.id,
            );

            const project =
                await ProjectModel.update(
                    projectId,
                    request.validated.body,
                );

            return response.json({
                success: true,
                data: { project },
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
    });
}

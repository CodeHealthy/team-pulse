import {
    mkdirSync,
    promises as fs,
} from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import multer from "multer";
import { z } from "zod";

import { AppError } from "../core/errors/app-error.js";
import { HTTP_STATUS } from "../core/http/http-status.js";
import {
    notFound,
    requireWorkspaceAccess,
} from "./access.js";

const id = z.string().regex(/^[a-f\d]{24}$/i);

export const taskAttachmentSchema = z.object({
    body: z.object({}),
    params: z.object({
        taskId: id,
    }),
    query: z.object({}),
});

export function createAttachmentFunctions({
    AttachmentRepository,
    TaskRepository,
    WorkspaceMemberRepository,
    uploadDir,
}) {
    const absoluteUploadDir =
        path.resolve(uploadDir);

    mkdirSync(absoluteUploadDir, {
        recursive: true,
    });

    const allowedMimeTypes = new Set([
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "text/csv",
        "application/zip",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]);

    const upload = multer({
        storage: multer.diskStorage({
            destination: absoluteUploadDir,
            filename: (
                _request,
                file,
                callback,
            ) => {
                callback(
                    null,
                    `${Date.now()}-${randomUUID()}${path.extname(file.originalname)}`,
                );
            },
        }),
        limits: {
            fileSize: 10 * 1024 * 1024,
            files: 1,
        },
        fileFilter: (
            _request,
            file,
            callback,
        ) => {
            if (
                !allowedMimeTypes.has(file.mimetype)
            ) {
                callback(
                    new AppError({
                        message:
                            "This file type is not allowed",
                        statusCode:
                            HTTP_STATUS.BAD_REQUEST,
                        code: "FILE_TYPE_NOT_ALLOWED",
                    }),
                );
                return;
            }

            callback(null, true);
        },
    }).single("file");

    async function requireTaskAccess(
        taskId,
        userId,
    ) {
        const task =
            await TaskRepository.findById(taskId);

        if (!task) {
            throw notFound("Task");
        }

        await requireWorkspaceAccess({
            WorkspaceMemberRepository,
            workspaceId: task.workspaceId,
            userId,
        });

        return task;
    }

    async function list(request, response, next) {
        try {
            const task = await requireTaskAccess(
                request.validated.params.taskId,
                request.auth.user.id,
            );

            return response.json({
                success: true,
                data: {
                    attachments:
                        await AttachmentRepository.listByTaskId(
                            task.id,
                        ),
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function authorizeUpload(
        request,
        _response,
        next,
    ) {
        try {
            request.attachmentTask =
                await requireTaskAccess(
                    request.validated.params.taskId,
                    request.auth.user.id,
                );

            return next();
        } catch (error) {
            return next(error);
        }
    }

    async function create(
        request,
        response,
        next,
    ) {
        try {
            const task = request.attachmentTask;

            if (!request.file) {
                throw new AppError({
                    message: "A file is required",
                    statusCode:
                        HTTP_STATUS.BAD_REQUEST,
                    code: "FILE_REQUIRED",
                });
            }

            let attachment;

            try {
                attachment =
                    await AttachmentRepository.create({
                        workspaceId:
                            task.workspaceId,
                        taskId: task.id,
                        uploadedBy:
                            request.auth.user.id,
                        originalName:
                            request.file
                                .originalname,
                        storedName:
                            request.file.filename,
                        mimeType:
                            request.file.mimetype,
                        size: request.file.size,
                    });
            } catch (error) {
                await fs
                    .unlink(request.file.path)
                    .catch(() => {});
                throw error;
            }

            return response
                .status(HTTP_STATUS.CREATED)
                .json({
                    success: true,
                    data: { attachment },
                });
        } catch (error) {
            return next(error);
        }
    }

    return Object.freeze({
        upload,
        authorizeUpload,
        list,
        create,
    });
}

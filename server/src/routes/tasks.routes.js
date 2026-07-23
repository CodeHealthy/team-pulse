import { Router } from "express";

import { validateRequest } from "../core/middleware/validate-request.js";
import { taskAttachmentSchema } from "../functions/attachments.js";
import {
    createCommentSchema,
    taskCommentsSchema,
} from "../functions/collaboration.js";
import {
    taskIdSchema,
    updateTaskSchema,
} from "../functions/tasks.js";

export function createTaskRouter({
    authFunctions,
    attachmentFunctions,
    collaborationFunctions,
    taskFunctions,
}) {
    const router = Router();

    router.use(authFunctions.requireAuth);
    router.patch(
        "/:taskId",
        validateRequest(updateTaskSchema),
        taskFunctions.update,
    );
    router.delete(
        "/:taskId",
        validateRequest(taskIdSchema),
        taskFunctions.remove,
    );
    router.get(
        "/:taskId/comments",
        validateRequest(taskCommentsSchema),
        collaborationFunctions.listComments,
    );
    router.post(
        "/:taskId/comments",
        validateRequest(createCommentSchema),
        collaborationFunctions.createComment,
    );
    router.get(
        "/:taskId/attachments",
        validateRequest(taskAttachmentSchema),
        attachmentFunctions.list,
    );
    router.post(
        "/:taskId/attachments",
        validateRequest(taskAttachmentSchema),
        attachmentFunctions.authorizeUpload,
        attachmentFunctions.upload,
        attachmentFunctions.create,
    );

    return router;
}

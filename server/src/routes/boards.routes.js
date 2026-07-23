import { Router } from "express";

import { validateRequest } from "../core/middleware/validate-request.js";
import {
    columnIdSchema,
    createColumnSchema,
    updateColumnSchema,
} from "../functions/boards.js";
import { createTaskSchema } from "../functions/tasks.js";

export function createBoardRouter({
    authFunctions,
    boardFunctions,
    taskFunctions,
}) {
    const router = Router();

    router.use(authFunctions.requireAuth);
    router.post(
        "/:boardId/columns",
        validateRequest(createColumnSchema),
        boardFunctions.createColumn,
    );
    router.post(
        "/:boardId/tasks",
        validateRequest(createTaskSchema),
        taskFunctions.create,
    );

    return router;
}

export function createColumnRouter({
    authFunctions,
    boardFunctions,
}) {
    const router = Router();

    router.use(authFunctions.requireAuth);
    router.patch(
        "/:columnId",
        validateRequest(updateColumnSchema),
        boardFunctions.updateColumn,
    );
    router.delete(
        "/:columnId",
        validateRequest(columnIdSchema),
        boardFunctions.removeColumn,
    );

    return router;
}

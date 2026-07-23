import { Router } from "express";

import { validateRequest } from "../core/middleware/validate-request.js";
import { boardByProjectSchema } from "../functions/boards.js";
import {
    projectIdSchema,
    updateProjectSchema,
} from "../functions/projects.js";

export function createProjectRouter({
    authFunctions,
    boardFunctions,
    projectFunctions,
}) {
    const router = Router();

    router.use(authFunctions.requireAuth);
    router.get(
        "/:projectId",
        validateRequest(projectIdSchema),
        projectFunctions.get,
    );
    router.patch(
        "/:projectId",
        validateRequest(updateProjectSchema),
        projectFunctions.update,
    );
    router.get(
        "/:projectId/board",
        validateRequest(boardByProjectSchema),
        boardFunctions.get,
    );

    return router;
}

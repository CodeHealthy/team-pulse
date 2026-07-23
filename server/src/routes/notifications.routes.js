import { Router } from "express";

import { validateRequest } from "../core/middleware/validate-request.js";
import { notificationIdSchema } from "../functions/collaboration.js";

export function createNotificationRouter({
    authFunctions,
    collaborationFunctions,
}) {
    const router = Router();

    router.use(authFunctions.requireAuth);
    router.get(
        "/",
        collaborationFunctions.listNotifications,
    );
    router.patch(
        "/read-all",
        collaborationFunctions.readAllNotifications,
    );
    router.patch(
        "/:notificationId/read",
        validateRequest(notificationIdSchema),
        collaborationFunctions.readNotification,
    );

    return router;
}

import { Router } from "express";

import { validateRequest } from "../core/middleware/validate-request.js";
import {
    channelSchema,
    createMessageSchema,
} from "../functions/collaboration.js";

export function createChannelRouter({
    authFunctions,
    collaborationFunctions,
}) {
    const router = Router();

    router.use(authFunctions.requireAuth);
    router.get(
        "/:channelId/messages",
        validateRequest(channelSchema),
        collaborationFunctions.listMessages,
    );
    router.post(
        "/:channelId/messages",
        validateRequest(createMessageSchema),
        collaborationFunctions.createMessage,
    );
    router.post(
        "/:channelId/read",
        validateRequest(channelSchema),
        collaborationFunctions.markChannelRead,
    );

    return router;
}

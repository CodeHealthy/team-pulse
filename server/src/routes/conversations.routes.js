import { Router } from "express";

import { validateRequest } from "../core/middleware/validate-request.js";
import {
    conversationSchema,
    createConversationSchema,
    directMessageSchema,
} from "../functions/conversations.js";

export function createConversationRouter({
    authFunctions,
    conversationFunctions,
}) {
    const router = Router();

    router.use(authFunctions.requireAuth);
    router.get("/", conversationFunctions.list);
    router.post(
        "/",
        validateRequest(createConversationSchema),
        conversationFunctions.create,
    );
    router.get(
        "/:conversationId/messages",
        validateRequest(conversationSchema),
        conversationFunctions.listMessages,
    );
    router.post(
        "/:conversationId/messages",
        validateRequest(directMessageSchema),
        conversationFunctions.sendMessage,
    );

    return router;
}

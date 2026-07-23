import { Router } from "express";

import { validateRequest } from "../core/middleware/validate-request.js";
import { acceptInvitationSchema } from "../functions/invitations.js";

export function createInvitationRouter({
    authFunctions,
    invitationFunctions,
}) {
    const router = Router();

    router.use(authFunctions.requireAuth);
    router.post(
        "/:token/accept",
        validateRequest(acceptInvitationSchema),
        invitationFunctions.accept,
    );

    return router;
}

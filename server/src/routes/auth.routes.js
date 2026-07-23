import { Router } from "express";

import { validateRequest } from "../core/middleware/validate-request.js";
import {
    loginSchema,
    registerSchema,
} from "../functions/auth.js";

export function createAuthRouter({
    authFunctions,
}) {
    const router = Router();

    router.post(
        "/register",
        validateRequest(registerSchema),
        authFunctions.register,
    );
    router.post(
        "/login",
        validateRequest(loginSchema),
        authFunctions.login,
    );
    router.post("/refresh", authFunctions.refresh);
    router.get(
        "/me",
        authFunctions.requireAuth,
        authFunctions.currentUser,
    );
    router.post(
        "/logout",
        authFunctions.logout,
    );

    return router;
}

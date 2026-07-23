import { Router } from "express";

import { validateRequest } from "../core/middleware/validate-request.js";
import {
    updatePersonalSettingsSchema,
    updatePrivacySettingsSchema,
    updateProfileSchema,
} from "../functions/settings.js";

export function createSettingsRouter({
    authFunctions,
    settingsFunctions,
}) {
    const router = Router();

    router.use(authFunctions.requireAuth);

    router.patch(
        "/profile",
        validateRequest(updateProfileSchema),
        settingsFunctions.updateProfile,
    );
    router.patch(
        "/personal",
        validateRequest(
            updatePersonalSettingsSchema,
        ),
        settingsFunctions.updatePersonalSettings,
    );
    router.patch(
        "/privacy",
        validateRequest(
            updatePrivacySettingsSchema,
        ),
        settingsFunctions.updatePrivacySettings,
    );

    return router;
}

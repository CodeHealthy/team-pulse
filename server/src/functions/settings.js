import { z } from "zod";

import { HTTP_STATUS } from "../core/http/http-status.js";

function isValidTimezone(timezone) {
    try {
        new Intl.DateTimeFormat("en", {
            timeZone: timezone,
        }).format();
        return true;
    } catch {
        return false;
    }
}

const nonEmptyUpdate = (schema) =>
    schema.refine(
        (body) => Object.keys(body).length > 0,
        "Provide at least one setting",
    );

export const updateProfileSchema = z.object({
    body: nonEmptyUpdate(
        z.object({
            name: z
                .string()
                .trim()
                .min(2)
                .max(80)
                .optional(),
            jobTitle: z
                .string()
                .trim()
                .max(100)
                .optional(),
        }),
    ),
    params: z.object({}),
    query: z.object({}),
});

export const updatePersonalSettingsSchema =
    z.object({
        body: nonEmptyUpdate(
            z.object({
                timezone: z
                    .string()
                    .trim()
                    .max(64)
                    .refine(
                        isValidTimezone,
                        "Select a valid timezone",
                    )
                    .optional(),
                dateFormat: z
                    .enum([
                        "month-day-year",
                        "day-month-year",
                        "year-month-day",
                    ])
                    .optional(),
                weekStartsOn: z
                    .enum(["sunday", "monday"])
                    .optional(),
                density: z
                    .enum([
                        "comfortable",
                        "compact",
                    ])
                    .optional(),
            }),
        ),
        params: z.object({}),
        query: z.object({}),
    });

export const updatePrivacySettingsSchema =
    z.object({
        body: nonEmptyUpdate(
            z.object({
                showOnlineStatus: z
                    .boolean()
                    .optional(),
                showEmailToWorkspaceMembers: z
                    .boolean()
                    .optional(),
            }),
        ),
        params: z.object({}),
        query: z.object({}),
    });

function toPublicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
        personalSettings:
            user.personalSettings,
        privacySettings:
            user.privacySettings,
        createdAt: user.createdAt,
    };
}

export function createSettingsFunctions({
    UserRepository,
}) {
    function sendUser(response, user) {
        return response
            .status(HTTP_STATUS.OK)
            .json({
                success: true,
                data: {
                    user: toPublicUser(user),
                },
            });
    }

    async function updateProfile(
        request,
        response,
        next,
    ) {
        try {
            const user =
                await UserRepository.updateProfileById(
                    request.auth.user.id,
                    request.validated.body,
                );

            return sendUser(response, user);
        } catch (error) {
            return next(error);
        }
    }

    async function updatePersonalSettings(
        request,
        response,
        next,
    ) {
        try {
            const user =
                await UserRepository.updatePersonalSettingsById(
                    request.auth.user.id,
                    request.validated.body,
                );

            return sendUser(response, user);
        } catch (error) {
            return next(error);
        }
    }

    async function updatePrivacySettings(
        request,
        response,
        next,
    ) {
        try {
            const user =
                await UserRepository.updatePrivacySettingsById(
                    request.auth.user.id,
                    request.validated.body,
                );

            return sendUser(response, user);
        } catch (error) {
            return next(error);
        }
    }

    return Object.freeze({
        updateProfile,
        updatePersonalSettings,
        updatePrivacySettings,
    });
}

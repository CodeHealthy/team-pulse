import bcrypt from "bcryptjs";
import {
    createHash,
    randomUUID,
    timingSafeEqual,
} from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { AppError } from "../core/errors/app-error.js";
import { HTTP_STATUS } from "../core/http/http-status.js";

const COOKIE_NAMES = Object.freeze({
    ACCESS_TOKEN: "tp_access",
    REFRESH_TOKEN: "tp_refresh",
});

const TOKEN_TYPES = Object.freeze({
    ACCESS: "access",
    REFRESH: "refresh",
});

const emailSchema = z
    .string()
    .trim()
    .email("Enter a valid email address")
    .toLowerCase();

export const registerSchema = z.object({
    body: z.object({
        name: z
            .string()
            .trim()
            .min(2, "Name must contain at least 2 characters")
            .max(80, "Name cannot exceed 80 characters"),
        email: emailSchema,
        password: z
            .string()
            .min(
                8,
                "Password must contain at least 8 characters",
            )
            .max(
                128,
                "Password cannot exceed 128 characters",
            ),
    }),
    params: z.object({}),
    query: z.object({}),
});

export const loginSchema = z.object({
    body: z.object({
        email: emailSchema,
        password: z
            .string()
            .min(1, "Password is required"),
    }),
    params: z.object({}),
    query: z.object({}),
});

function toPublicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
    };
}

function authenticationError(
    message = "Authentication is required",
) {
    return new AppError({
        message,
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTHENTICATION_REQUIRED",
    });
}

function getTokenExpiry(token) {
    const payload = jwt.decode(token);

    if (!payload || typeof payload.exp !== "number") {
        throw new Error(
            "The generated token does not contain an expiry",
        );
    }

    return new Date(payload.exp * 1000);
}

function hashToken(token) {
    return createHash("sha256")
        .update(token)
        .digest("hex");
}

function tokenMatchesHash(token, expectedHash) {
    const actual = Buffer.from(
        hashToken(token),
        "hex",
    );
    const expected = Buffer.from(
        expectedHash,
        "hex",
    );

    return (
        actual.length === expected.length &&
        timingSafeEqual(actual, expected)
    );
}

/**
 * Creates all authentication endpoint functions. Authentication
 * logic stays together while model classes own database access.
 */
export function createAuthFunctions({
    UserModel,
    RefreshSessionModel,
    config,
}) {
    const refreshCookiePath = `${config.apiPrefix}/auth`;

    function signToken({
        userId,
        type,
        secret,
        expiresIn,
        sessionId,
    }) {
        return jwt.sign(
            {
                type,
                ...(sessionId
                    ? { sessionId }
                    : {}),
            },
            secret,
            {
                algorithm: "HS256",
                subject: userId,
                expiresIn,
                jwtid: randomUUID(),
            },
        );
    }

    function issueTokenPair(
        userId,
        sessionId = randomUUID(),
    ) {
        const accessToken = signToken({
            userId,
            type: TOKEN_TYPES.ACCESS,
            secret: config.accessTokenSecret,
            expiresIn:
                config.accessTokenExpiresIn,
        });
        const refreshToken = signToken({
            userId,
            type: TOKEN_TYPES.REFRESH,
            secret: config.refreshTokenSecret,
            expiresIn:
                config.refreshTokenExpiresIn,
            sessionId,
        });

        return {
            sessionId,
            accessToken,
            refreshToken,
            accessTokenExpiresAt:
                getTokenExpiry(accessToken),
            refreshTokenExpiresAt:
                getTokenExpiry(refreshToken),
            refreshTokenHash:
                hashToken(refreshToken),
        };
    }

    function verifyToken(
        token,
        secret,
        expectedType,
    ) {
        const payload = jwt.verify(
            token,
            secret,
            {
                algorithms: ["HS256"],
            },
        );

        if (
            typeof payload !== "object" ||
            payload.type !== expectedType ||
            !payload.sub
        ) {
            throw new Error("Invalid token payload");
        }

        return payload;
    }

    function verifyAccessToken(token) {
        return verifyToken(
            token,
            config.accessTokenSecret,
            TOKEN_TYPES.ACCESS,
        );
    }

    function verifyRefreshToken(token) {
        const payload = verifyToken(
            token,
            config.refreshTokenSecret,
            TOKEN_TYPES.REFRESH,
        );

        if (!payload.sessionId) {
            throw new Error(
                "Refresh token has no session identifier",
            );
        }

        return payload;
    }

    function cookieOptions(path, expires) {
        return {
            httpOnly: true,
            secure: config.secureCookies,
            sameSite: "lax",
            path,
            ...(expires ? { expires } : {}),
        };
    }

    function setAuthCookies(response, tokens) {
        response.cookie(
            COOKIE_NAMES.ACCESS_TOKEN,
            tokens.accessToken,
            cookieOptions(
                "/",
                tokens.accessTokenExpiresAt,
            ),
        );
        response.cookie(
            COOKIE_NAMES.REFRESH_TOKEN,
            tokens.refreshToken,
            cookieOptions(
                refreshCookiePath,
                tokens.refreshTokenExpiresAt,
            ),
        );
    }

    function clearAuthCookies(response) {
        response.clearCookie(
            COOKIE_NAMES.ACCESS_TOKEN,
            cookieOptions("/"),
        );
        response.clearCookie(
            COOKIE_NAMES.REFRESH_TOKEN,
            cookieOptions(refreshCookiePath),
        );
    }

    async function createSession(user) {
        const tokens = issueTokenPair(user.id);

        await RefreshSessionModel.create({
            sessionId: tokens.sessionId,
            userId: user.id,
            tokenHash: tokens.refreshTokenHash,
            expiresAt:
                tokens.refreshTokenExpiresAt,
        });

        return {
            user: toPublicUser(user),
            tokens,
        };
    }

    async function register(
        request,
        response,
        next,
    ) {
        try {
            const { name, email, password } =
                request.validated.body;
            const existingUser =
                await UserModel.findByEmail(email);

            if (existingUser) {
                throw new AppError({
                    message:
                        "An account with this email already exists",
                    statusCode:
                        HTTP_STATUS.CONFLICT,
                    code: "EMAIL_ALREADY_REGISTERED",
                });
            }

            const passwordHash = await bcrypt.hash(
                password,
                config.bcryptSaltRounds,
            );

            let user;

            try {
                user = await UserModel.create({
                    name,
                    email,
                    passwordHash,
                });
            } catch (error) {
                // The unique index handles concurrent
                // registrations for the same email address.
                if (error?.code === 11000) {
                    throw new AppError({
                        message:
                            "An account with this email already exists",
                        statusCode:
                            HTTP_STATUS.CONFLICT,
                        code: "EMAIL_ALREADY_REGISTERED",
                    });
                }

                throw error;
            }

            const session =
                await createSession(user);

            setAuthCookies(
                response,
                session.tokens,
            );

            return response
                .status(HTTP_STATUS.CREATED)
                .json({
                    success: true,
                    data: {
                        user: session.user,
                    },
                });
        } catch (error) {
            return next(error);
        }
    }

    async function login(
        request,
        response,
        next,
    ) {
        try {
            const { email, password } =
                request.validated.body;
            const user =
                await UserModel.findByEmail(
                    email,
                    { includePassword: true },
                );
            const passwordMatches =
                user &&
                (await bcrypt.compare(
                    password,
                    user.passwordHash,
                ));

            if (!passwordMatches) {
                throw authenticationError(
                    "Invalid email or password",
                );
            }

            const session =
                await createSession(user);

            setAuthCookies(
                response,
                session.tokens,
            );

            return response
                .status(HTTP_STATUS.OK)
                .json({
                    success: true,
                    data: {
                        user: session.user,
                    },
                });
        } catch (error) {
            return next(error);
        }
    }

    async function refresh(
        request,
        response,
        next,
    ) {
        try {
            const refreshToken =
                request.cookies[
                    COOKIE_NAMES.REFRESH_TOKEN
                ];
            let payload;

            try {
                payload =
                    verifyRefreshToken(
                        refreshToken,
                    );
            } catch {
                throw authenticationError(
                    "The session is invalid or has expired",
                );
            }

            const session =
                await RefreshSessionModel.findById(
                    payload.sessionId,
                );

            if (
                !session ||
                session.userId !== payload.sub ||
                session.expiresAt <= new Date()
            ) {
                throw authenticationError(
                    "The session is invalid or has expired",
                );
            }

            if (
                !tokenMatchesHash(
                    refreshToken,
                    session.tokenHash,
                )
            ) {
                await RefreshSessionModel.revoke(
                    payload.sessionId,
                );

                throw authenticationError(
                    "The session is invalid or has expired",
                );
            }

            const user = await UserModel.findById(
                payload.sub,
            );

            if (!user) {
                await RefreshSessionModel.revoke(
                    payload.sessionId,
                );
                throw authenticationError();
            }

            const tokens = issueTokenPair(
                user.id,
                payload.sessionId,
            );

            await RefreshSessionModel.rotate(
                payload.sessionId,
                {
                    tokenHash:
                        tokens.refreshTokenHash,
                    expiresAt:
                        tokens.refreshTokenExpiresAt,
                },
            );

            setAuthCookies(response, tokens);

            return response
                .status(HTTP_STATUS.OK)
                .json({
                    success: true,
                    data: {
                        user: toPublicUser(user),
                    },
                });
        } catch (error) {
            clearAuthCookies(response);
            return next(error);
        }
    }

    async function requireAuth(
        request,
        _response,
        next,
    ) {
        try {
            const authorization =
                request.get("authorization");
            const accessToken =
                authorization?.startsWith(
                    "Bearer ",
                )
                    ? authorization
                          .slice(7)
                          .trim()
                    : request.cookies[
                          COOKIE_NAMES
                              .ACCESS_TOKEN
                      ];
            request.auth = {
                user: await authenticateToken(
                    accessToken,
                ),
            };

            return next();
        } catch (error) {
            return next(error);
        }
    }

    async function authenticateToken(accessToken) {
        let payload;

        try {
            payload =
                verifyAccessToken(accessToken);
        } catch {
            throw authenticationError(
                "The access token is invalid or has expired",
            );
        }

        const user = await UserModel.findById(
            payload.sub,
        );
        if (!user) {
            throw authenticationError();
        }
        return toPublicUser(user);
    }

    function currentUser(request, response) {
        return response
            .status(HTTP_STATUS.OK)
            .json({
                success: true,
                data: {
                    user: request.auth.user,
                },
            });
    }

    async function logout(
        request,
        response,
        next,
    ) {
        try {
            const refreshToken =
                request.cookies[
                    COOKIE_NAMES.REFRESH_TOKEN
                ];

            if (refreshToken) {
                try {
                    const payload =
                        verifyRefreshToken(
                            refreshToken,
                        );

                    await RefreshSessionModel.revoke(
                        payload.sessionId,
                    );
                } catch {
                    // Logout is idempotent for expired or
                    // malformed refresh cookies.
                }
            }

            clearAuthCookies(response);

            return response
                .status(HTTP_STATUS.NO_CONTENT)
                .send();
        } catch (error) {
            return next(error);
        }
    }

    return Object.freeze({
        register,
        login,
        refresh,
        requireAuth,
        currentUser,
        authenticateToken,
        logout,
    });
}

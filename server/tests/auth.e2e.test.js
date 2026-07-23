import request from "supertest";
import {
    describe,
    expect,
    it,
} from "vitest";

import { createApp } from "../src/app.js";
import { createAuthFunctions } from "../src/functions/auth.js";
import { createApiRouter } from "../src/routes/api-router.js";

function createMemoryModels() {
    const users = new Map();
    const sessions = new Map();
    let nextUserId = 1;

    class UserModel {
        static async findByEmail(email) {
            return (
                [...users.values()].find(
                    (user) =>
                        user.email === email,
                ) ?? null
            );
        }

        static async findById(userId) {
            return users.get(userId) ?? null;
        }

        static async create({
            name,
            email,
            passwordHash,
        }) {
            const id = String(nextUserId++);
            const user = {
                id,
                name,
                email,
                passwordHash,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            users.set(id, user);
            return user;
        }
    }

    class RefreshSessionModel {
        static async create(session) {
            sessions.set(
                session.sessionId,
                { ...session },
            );
        }

        static async findById(sessionId) {
            return sessions.get(sessionId) ?? null;
        }

        static async rotate(
            sessionId,
            changes,
        ) {
            sessions.set(sessionId, {
                ...sessions.get(sessionId),
                ...changes,
            });
        }

        static async revoke(sessionId) {
            sessions.delete(sessionId);
        }
    }

    return {
        UserModel,
        RefreshSessionModel,
    };
}

function createTestApplication() {
    const { UserModel, RefreshSessionModel } =
        createMemoryModels();

    const authFunctions =
        createAuthFunctions({
            UserModel,
            RefreshSessionModel,
            config: {
                apiPrefix: "/api",
                secureCookies: false,
                bcryptSaltRounds: 10,
                accessTokenSecret:
                    "test-access-secret-with-at-least-32-characters",
                refreshTokenSecret:
                    "test-refresh-secret-with-at-least-32-characters",
                accessTokenExpiresIn: "15m",
                refreshTokenExpiresIn: "7d",
            },
        });

    const apiRouter = createApiRouter({
        authFunctions,
        healthFunctions: {
            checkHealth(
                _request,
                response,
            ) {
                return response
                    .status(501)
                    .send();
            },
        },
    });

    return createApp({
        config: {
            nodeEnv: "test",
            apiPrefix: "/api",
            clientUrl:
                "http://localhost:5173",
            requestBodyLimit: "1mb",
        },
        apiRouter,
    });
}

const registration = {
    name: "Avery Stone",
    email: "avery@example.com",
    password: "strong-password",
};

function getCookie(response, name) {
    const cookie = response.headers[
        "set-cookie"
    ]?.find((value) =>
        value.startsWith(`${name}=`),
    );

    return cookie?.split(";")[0];
}

describe("authentication API", () => {
    it("registers a user and returns the current session", async () => {
        const agent = request.agent(
            createTestApplication(),
        );

        const registrationResponse = await agent
            .post("/api/auth/register")
            .send(registration)
            .expect(201);

        expect(
            registrationResponse.headers["set-cookie"],
        ).toEqual(
            expect.arrayContaining([
                expect.stringContaining(
                    "tp_access=",
                ),
                expect.stringContaining(
                    "tp_refresh=",
                ),
            ]),
        );

        expect(
            registrationResponse.body,
        ).toMatchObject({
            success: true,
            data: {
                user: {
                    name: registration.name,
                    email: registration.email,
                },
            },
        });

        expect(
            registrationResponse.body.data.user,
        ).not.toHaveProperty("passwordHash");

        const currentUserResponse = await agent
            .get("/api/auth/me")
            .expect(200);

        expect(
            currentUserResponse.body.data.user,
        ).toMatchObject({
            name: registration.name,
            email: registration.email,
        });
    });

    it("refreshes and logs out an authenticated session", async () => {
        const agent = request.agent(
            createTestApplication(),
        );

        await agent
            .post("/api/auth/register")
            .send(registration)
            .expect(201);

        await agent
            .post("/api/auth/refresh")
            .expect(200);

        await agent
            .post("/api/auth/logout")
            .expect(204);

        await agent
            .get("/api/auth/me")
            .expect(401);

        await agent
            .post("/api/auth/refresh")
            .expect(401);
    });

    it("rotates refresh tokens and rejects replayed tokens", async () => {
        const app = createTestApplication();

        const registrationResponse =
            await request(app)
                .post("/api/auth/register")
                .send(registration)
                .expect(201);

        const originalRefreshToken = getCookie(
            registrationResponse,
            "tp_refresh",
        );

        const refreshResponse = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", originalRefreshToken)
            .expect(200);

        const rotatedRefreshToken = getCookie(
            refreshResponse,
            "tp_refresh",
        );

        expect(rotatedRefreshToken).not.toBe(
            originalRefreshToken,
        );

        await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", originalRefreshToken)
            .expect(401);

        // Replaying an old token revokes the entire session,
        // including the newest token in that rotation chain.
        await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", rotatedRefreshToken)
            .expect(401);
    });

    it("logs in with valid credentials and rejects an invalid password", async () => {
        const app = createTestApplication();

        await request(app)
            .post("/api/auth/register")
            .send(registration)
            .expect(201);

        await request(app)
            .post("/api/auth/login")
            .send({
                email: registration.email,
                password: "incorrect-password",
            })
            .expect(401);

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: registration.email,
                password: registration.password,
            })
            .expect(200);

        expect(
            loginResponse.body.data.user.email,
        ).toBe(registration.email);
    });

    it("validates registration input and prevents duplicate accounts", async () => {
        const app = createTestApplication();

        await request(app)
            .post("/api/auth/register")
            .send({
                name: "A",
                email: "invalid",
                password: "short",
            })
            .expect(422);

        await request(app)
            .post("/api/auth/register")
            .send(registration)
            .expect(201);

        const duplicateResponse = await request(app)
            .post("/api/auth/register")
            .send(registration)
            .expect(409);

        expect(
            duplicateResponse.body.error.code,
        ).toBe("EMAIL_ALREADY_REGISTERED");
    });
});

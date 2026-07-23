import { APP_METADATA } from "@teampulse/contracts/app-metadata";
import request from "supertest";
import {
    describe,
    expect,
    it,
} from "vitest";

import { createApp } from "../src/app.js";
import { createHealthFunctions } from "../src/functions/health.js";
import { createApiRouter } from "../src/routes/api-router.js";

function createTestApplication() {
    const databaseStub = {
        isConnected: () => true,
        getStatus: () => "connected",
    };

    const healthFunctions =
        createHealthFunctions({
            appName: APP_METADATA.NAME,
            database: databaseStub,
        });

    const apiRouter = createApiRouter({
        authFunctions: {
            register: notImplemented,
            login: notImplemented,
            refresh: notImplemented,
            requireAuth: notImplemented,
            currentUser: notImplemented,
            logout: notImplemented,
        },
        healthFunctions,
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

function notImplemented(_request, response) {
    return response.status(501).send();
}

describe("GET /api/health", () => {
    it("returns the application health status", async () => {
        const app = createTestApplication();

        const response = await request(app)
            .get("/api/health")
            .expect(200);

        expect(response.body).toMatchObject({
            success: true,
            data: {
                application: "TeamPulse",
                status: "ok",
                database: "connected",
            },
        });
    });
});

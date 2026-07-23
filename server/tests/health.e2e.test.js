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
import { createRouteFunctionStubs } from "./support/route-function-stubs.js";

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

    const apiRouter = createApiRouter(
        createRouteFunctionStubs({
            healthFunctions,
        }),
    );

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

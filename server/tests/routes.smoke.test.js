import request from "supertest";
import {
    describe,
    it,
} from "vitest";

import { createApp } from "../src/app.js";
import { createApiRouter } from "../src/routes/api-router.js";
import { createRouteFunctionStubs } from "./support/route-function-stubs.js";

const id = "507f1f77bcf86cd799439011";
const token = "a".repeat(64);

function createTestApplication() {
    return createApp({
        config: {
            nodeEnv: "test",
            apiPrefix: "/api",
            clientUrl:
                "http://localhost:5173",
            requestBodyLimit: "1mb",
        },
        apiRouter: createApiRouter(
            createRouteFunctionStubs(),
        ),
    });
}

const routes = [
    ["post", "/api/auth/register", { name: "Test User", email: "test@example.com", password: "password1" }],
    ["post", "/api/auth/login", { email: "test@example.com", password: "password1" }],
    ["post", "/api/auth/refresh"],
    ["get", "/api/auth/me"],
    ["post", "/api/auth/logout"],
    ["get", "/api/workspaces"],
    ["post", "/api/workspaces", { name: "Workspace" }],
    ["get", `/api/workspaces/${id}`],
    ["patch", `/api/workspaces/${id}`, { name: "Updated workspace" }],
    ["get", `/api/workspaces/${id}/members`],
    ["patch", `/api/workspaces/${id}/members/${id}`, { role: "member" }],
    ["get", `/api/workspaces/${id}/invitations`],
    ["post", `/api/workspaces/${id}/invitations`, { email: "member@example.com", role: "member" }],
    ["get", `/api/workspaces/${id}/projects`],
    ["post", `/api/workspaces/${id}/projects`, { name: "Project" }],
    ["get", `/api/workspaces/${id}/channels`],
    ["post", `/api/workspaces/${id}/channels`, { name: "general" }],
    ["get", `/api/workspaces/${id}/search?q=task`],
    ["get", `/api/workspaces/${id}/calendar?from=2026-01-01&to=2026-12-31`],
    ["get", `/api/workspaces/${id}/analytics`],
    ["get", `/api/workspaces/${id}/activity`],
    ["post", `/api/invitations/${token}/accept`],
    ["get", `/api/projects/${id}`],
    ["patch", `/api/projects/${id}`, { name: "Updated project" }],
    ["get", `/api/projects/${id}/board`],
    ["post", `/api/boards/${id}/columns`, { name: "Review" }],
    ["post", `/api/boards/${id}/tasks`, { columnId: id, title: "Task" }],
    ["patch", `/api/columns/${id}`, { name: "Done" }],
    ["delete", `/api/columns/${id}`],
    ["patch", `/api/tasks/${id}`, { title: "Updated task" }],
    ["delete", `/api/tasks/${id}`],
    ["get", `/api/tasks/${id}/comments`],
    ["post", `/api/tasks/${id}/comments`, { content: "Comment" }],
    ["get", `/api/tasks/${id}/attachments`],
    ["post", `/api/tasks/${id}/attachments`],
    ["get", `/api/channels/${id}/messages`],
    ["post", `/api/channels/${id}/messages`, { content: "Message" }],
    ["post", `/api/channels/${id}/read`],
    ["get", "/api/conversations"],
    ["post", "/api/conversations", { workspaceId: id, participantId: id }],
    ["get", `/api/conversations/${id}/messages`],
    ["post", `/api/conversations/${id}/messages`, { content: "Direct message" }],
    ["get", "/api/notifications"],
    ["patch", "/api/notifications/read-all"],
    ["patch", `/api/notifications/${id}/read`],
    ["get", "/api/health"],
];

describe("API route inventory", () => {
    it("preserves every public endpoint during router refactoring", async () => {
        const app = createTestApplication();

        for (const [method, path, body] of routes) {
            let operation = request(app)[method](path);

            if (body) {
                operation = operation.send(body);
            }

            await operation.expect(204);
        }
    });
});

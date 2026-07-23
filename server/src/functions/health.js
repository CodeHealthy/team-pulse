import { HTTP_STATUS } from "../core/http/http-status.js";

export function createHealthFunctions({
    appName,
    database,
}) {
    function checkHealth(_request, response) {
        const healthy = database.isConnected();
        const statusCode = healthy
            ? HTTP_STATUS.OK
            : HTTP_STATUS.SERVICE_UNAVAILABLE;

        return response.status(statusCode).json({
            success: healthy,
            data: {
                application: appName,
                status: healthy ? "ok" : "degraded",
                database: database.getStatus(),
                uptimeSeconds: Math.floor(
                    process.uptime(),
                ),
                timestamp: new Date().toISOString(),
            },
        });
    }

    return Object.freeze({
        checkHealth,
    });
}

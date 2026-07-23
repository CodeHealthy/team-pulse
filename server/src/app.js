import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { createErrorHandler } from "./core/middleware/error-handler.js";
import { notFoundHandler } from "./core/middleware/not-found.js";

export function createApp({
    config,
    apiRouter,
}) {
    const app = express();

    app.disable("x-powered-by");

    app.use(
        cors({
            origin: config.clientUrl,
            credentials: true,
        }),
    );

    app.use(
        express.json({
            limit: config.requestBodyLimit,
        }),
    );

    app.use(
        express.urlencoded({
            extended: false,
            limit: config.requestBodyLimit,
        }),
    );

    app.use(cookieParser());

    if (config.uploadDir) {
        app.use(
            "/uploads",
            express.static(config.uploadDir, {
                fallthrough: false,
            }),
        );
    }

    app.use(config.apiPrefix, apiRouter);

    app.use(notFoundHandler);

    app.use(
        createErrorHandler({
            nodeEnv: config.nodeEnv,
        }),
    );

    return app;
}

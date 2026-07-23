import { HTTP_STATUS } from "../http/http-status.js";

export function createErrorHandler({ nodeEnv }) {
    return function errorHandler(
        error,
        _request,
        response,
        next,
    ) {
        if (response.headersSent) {
            return next(error);
        }

        const statusCode =
            error.statusCode ??
            HTTP_STATUS.INTERNAL_SERVER_ERROR;

        const isOperational = error.isOperational === true;

        const errorResponse = {
            success: false,
            error: {
                code:
                    error.code ??
                    "INTERNAL_SERVER_ERROR",

                message: isOperational
                    ? error.message
                    : "An unexpected server error occurred",
            },
        };

        if (error.details) {
            errorResponse.error.details = error.details;
        }

        if (nodeEnv !== "production") {
            errorResponse.error.stack = error.stack;
        }

        return response
            .status(statusCode)
            .json(errorResponse);
    };
}
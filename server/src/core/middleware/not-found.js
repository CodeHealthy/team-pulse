import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "../http/http-status.js";

export function notFoundHandler(request, _response, next) {
    next(
        new AppError({
            message: `Route not found: ${request.method} ${request.originalUrl}`,
            statusCode: HTTP_STATUS.NOT_FOUND,
            code: "ROUTE_NOT_FOUND",
        }),
    );
}
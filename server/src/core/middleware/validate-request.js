import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "../http/http-status.js";

export function validateRequest(schema) {
    return function requestValidationMiddleware(
        request,
        _response,
        next,
    ) {
        const result = schema.safeParse({
            // Express does not create request.body for requests
            // without a payload. Validation schemas consistently
            // model an absent body, params, or query as an object.
            body: request.body ?? {},
            params: request.params ?? {},
            query: request.query ?? {},
        });

        if (!result.success) {
            const details = result.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
                code: issue.code,
            }));

            return next(
                new AppError({
                    message: "Request validation failed",
                    statusCode:
                        HTTP_STATUS.UNPROCESSABLE_ENTITY,
                    code: "VALIDATION_ERROR",
                    details,
                }),
            );
        }

        request.validated = result.data;

        return next();
    };
}

import { HTTP_STATUS } from "../http/http-status.js";

export class AppError extends Error {
    constructor({
        message,
        statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
        code = "APPLICATION_ERROR",
        details = null,
        isOperational = true,
    }) {
        super(message);

        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}
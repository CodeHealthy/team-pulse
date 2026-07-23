import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    PORT: z.coerce
        .number()
        .int()
        .min(1)
        .max(65535)
        .default(5000),

    API_PREFIX: z
        .string()
        .regex(/^\/[a-z0-9/_-]*$/i)
        .default("/api"),

    CLIENT_URL: z.url(),

    MONGODB_URI: z
        .string()
        .trim()
        .min(1, "MONGODB_URI is required"),

    MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(10000),

    REQUEST_BODY_LIMIT: z
        .string()
        .trim()
        .default("1mb"),

    JWT_ACCESS_SECRET: z
        .string()
        .min(32, "JWT_ACCESS_SECRET must contain at least 32 characters"),

    JWT_REFRESH_SECRET: z
        .string()
        .min(32, "JWT_REFRESH_SECRET must contain at least 32 characters"),

    JWT_ACCESS_EXPIRES_IN: z
        .string()
        .trim()
        .default("15m"),

    JWT_REFRESH_EXPIRES_IN: z
        .string()
        .trim()
        .default("7d"),

    BCRYPT_SALT_ROUNDS: z.coerce
        .number()
        .int()
        .min(10)
        .max(15)
        .default(12),

    REDIS_URL: z.string().url().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().default("TeamPulse <no-reply@teampulse.local>"),
    UPLOAD_DIR: z.string().trim().default("uploads"),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
    const issues = result.error.issues
        .map((issue) => {
            const field = issue.path.join(".") || "environment";
            return `${field}: ${issue.message}`;
        })
        .join("\n");

    throw new Error(`Invalid environment configuration:\n${issues}`);
}

const values = result.data;

export const env = Object.freeze({
    app: Object.freeze({
        nodeEnv: values.NODE_ENV,
        port: values.PORT,
        apiPrefix: values.API_PREFIX,
        clientUrl: values.CLIENT_URL,
        requestBodyLimit: values.REQUEST_BODY_LIMIT,
    }),

    database: Object.freeze({
        uri: values.MONGODB_URI,
        serverSelectionTimeoutMs:
            values.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    }),

    auth: Object.freeze({
        accessTokenSecret: values.JWT_ACCESS_SECRET,
        refreshTokenSecret: values.JWT_REFRESH_SECRET,
        accessTokenExpiresIn: values.JWT_ACCESS_EXPIRES_IN,
        refreshTokenExpiresIn: values.JWT_REFRESH_EXPIRES_IN,
        bcryptSaltRounds: values.BCRYPT_SALT_ROUNDS,
    }),

    services: Object.freeze({
        redisUrl: values.REDIS_URL,
        smtp: Object.freeze({
            host: values.SMTP_HOST,
            port: values.SMTP_PORT,
            user: values.SMTP_USER,
            pass: values.SMTP_PASS,
            from: values.SMTP_FROM,
        }),
        uploadDir: values.UPLOAD_DIR,
    }),
}); 

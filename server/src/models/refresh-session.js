import mongoose from "mongoose";

const refreshSessionSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
            index: true,
        },
        tokenHash: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            expires: 0,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

const RefreshSessionDocument =
    mongoose.models.RefreshSession ??
    mongoose.model(
        "RefreshSession",
        refreshSessionSchema,
    );

/**
 * Represents server-side login sessions. Only hashed refresh
 * tokens are persisted so database access cannot expose tokens.
 */
export class RefreshSession {
    static async create(session) {
        await RefreshSessionDocument.create(session);
    }

    static async findById(sessionId) {
        const session =
            await RefreshSessionDocument.findOne({
                sessionId,
            })
                .lean()
                .exec();

        if (!session) {
            return null;
        }

        return {
            sessionId: session.sessionId,
            userId: session.userId.toString(),
            tokenHash: session.tokenHash,
            expiresAt: session.expiresAt,
        };
    }

    static async rotate(
        sessionId,
        { tokenHash, expiresAt },
    ) {
        await RefreshSessionDocument.updateOne(
            { sessionId },
            { tokenHash, expiresAt },
        ).exec();
    }

    static async revoke(sessionId) {
        await RefreshSessionDocument.deleteOne({
            sessionId,
        }).exec();
    }
}

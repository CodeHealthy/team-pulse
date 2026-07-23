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

const RefreshSessionModel =
    mongoose.models.RefreshSession ??
    mongoose.model(
        "RefreshSession",
        refreshSessionSchema,
    );

/**
 * Represents server-side login sessions. Only hashed refresh
 * tokens are persisted so database access cannot expose tokens.
 */
export const refreshSessionRepository = Object.freeze({
    async create(session) {
        await RefreshSessionModel.create(session);
    },

    async findById(sessionId) {
        const session =
            await RefreshSessionModel.findOne({
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
    },

    async rotate(
        sessionId,
        { tokenHash, expiresAt },
    ) {
        await RefreshSessionModel.updateOne(
            { sessionId },
            { tokenHash, expiresAt },
        ).exec();
    },

    async revoke(sessionId) {
        await RefreshSessionModel.deleteOne({
            sessionId,
        }).exec();
    },
});

export { RefreshSessionModel };

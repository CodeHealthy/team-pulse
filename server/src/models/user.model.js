import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 254,
        },
        passwordHash: {
            type: String,
            required: true,
            select: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

const UserModel =
    mongoose.models.User ??
    mongoose.model("User", userSchema);

function toRecord(document) {
    if (!document) {
        return null;
    }

    return {
        id: document.id,
        name: document.name,
        email: document.email,
        passwordHash: document.passwordHash,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
    };
}

/**
 * Keeps all User database operations behind one model class.
 * Endpoint functions do not need to know Mongoose query details.
 */
export const userRepository = Object.freeze({
    async findByEmail(
        email,
        { includePassword = false } = {},
    ) {
        let query = UserModel.findOne({ email });

        if (includePassword) {
            query = query.select("+passwordHash");
        }

        return toRecord(await query.exec());
    },

    async findById(userId) {
        return toRecord(
            await UserModel.findById(
                userId,
            ).exec(),
        );
    },

    async create({
        name,
        email,
        passwordHash,
    }) {
        return toRecord(
            await UserModel.create({
                name,
                email,
                passwordHash,
            }),
        );
    },
});

export { UserModel };

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

const UserDocument =
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
export class User {
    static async findByEmail(
        email,
        { includePassword = false } = {},
    ) {
        let query = UserDocument.findOne({ email });

        if (includePassword) {
            query = query.select("+passwordHash");
        }

        return toRecord(await query.exec());
    }

    static async findById(userId) {
        return toRecord(
            await UserDocument.findById(
                userId,
            ).exec(),
        );
    }

    static async create({
        name,
        email,
        passwordHash,
    }) {
        return toRecord(
            await UserDocument.create({
                name,
                email,
                passwordHash,
            }),
        );
    }
}

import mongoose from "mongoose";

const personalSettingsSchema =
    new mongoose.Schema(
        {
            timezone: {
                type: String,
                default: "UTC",
                maxlength: 64,
            },
            dateFormat: {
                type: String,
                enum: [
                    "month-day-year",
                    "day-month-year",
                    "year-month-day",
                ],
                default: "month-day-year",
            },
            weekStartsOn: {
                type: String,
                enum: ["sunday", "monday"],
                default: "monday",
            },
            density: {
                type: String,
                enum: ["comfortable", "compact"],
                default: "comfortable",
            },
        },
        { _id: false },
    );

const privacySettingsSchema =
    new mongoose.Schema(
        {
            showOnlineStatus: {
                type: Boolean,
                default: true,
            },
            showEmailToWorkspaceMembers: {
                type: Boolean,
                default: true,
            },
        },
        { _id: false },
    );

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
        jobTitle: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "",
        },
        personalSettings: {
            type: personalSettingsSchema,
            default: () => ({}),
        },
        privacySettings: {
            type: privacySettingsSchema,
            default: () => ({}),
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
        jobTitle: document.jobTitle ?? "",
        personalSettings: {
            timezone:
                document.personalSettings
                    ?.timezone ?? "UTC",
            dateFormat:
                document.personalSettings
                    ?.dateFormat ??
                "month-day-year",
            weekStartsOn:
                document.personalSettings
                    ?.weekStartsOn ?? "monday",
            density:
                document.personalSettings
                    ?.density ?? "comfortable",
        },
        privacySettings: {
            showOnlineStatus:
                document.privacySettings
                    ?.showOnlineStatus ?? true,
            showEmailToWorkspaceMembers:
                document.privacySettings
                    ?.showEmailToWorkspaceMembers ??
                true,
        },
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

    async updateProfileById(userId, changes) {
        const update = {};

        if (changes.name !== undefined) {
            update.name = changes.name;
        }

        if (changes.jobTitle !== undefined) {
            update.jobTitle = changes.jobTitle;
        }

        return toRecord(
            await UserModel.findByIdAndUpdate(
                userId,
                { $set: update },
                {
                    new: true,
                    runValidators: true,
                },
            ).exec(),
        );
    },

    async updatePersonalSettingsById(
        userId,
        settings,
    ) {
        const update = Object.fromEntries(
            Object.entries(settings).map(
                ([key, value]) => [
                    `personalSettings.${key}`,
                    value,
                ],
            ),
        );

        return toRecord(
            await UserModel.findByIdAndUpdate(
                userId,
                { $set: update },
                {
                    new: true,
                    runValidators: true,
                },
            ).exec(),
        );
    },

    async updatePrivacySettingsById(
        userId,
        settings,
    ) {
        const update = Object.fromEntries(
            Object.entries(settings).map(
                ([key, value]) => [
                    `privacySettings.${key}`,
                    value,
                ],
            ),
        );

        return toRecord(
            await UserModel.findByIdAndUpdate(
                userId,
                { $set: update },
                {
                    new: true,
                    runValidators: true,
                },
            ).exec(),
        );
    },
});

export { UserModel };

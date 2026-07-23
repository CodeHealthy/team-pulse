import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Workspace",
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
            index: true,
        },
        role: {
            type: String,
            required: true,
            enum: ["owner", "admin", "member"],
            default: "member",
        },
    },
    { timestamps: true, versionKey: false },
);

schema.index({ workspaceId: 1, userId: 1 }, { unique: true });

const Document =
    mongoose.models.WorkspaceMember ??
    mongoose.model("WorkspaceMember", schema);

function record(document) {
    if (!document) return null;

    const user =
        document.userId && typeof document.userId === "object" && document.userId.email
            ? {
                  id: document.userId._id.toString(),
                  name: document.userId.name,
                  email: document.userId.email,
              }
            : null;

    return {
        id: document._id.toString(),
        workspaceId: document.workspaceId.toString(),
        userId: user ? user.id : document.userId.toString(),
        role: document.role,
        user,
        createdAt: document.createdAt,
    };
}

export class WorkspaceMember {
    static async create(values) {
        return record(await Document.create(values));
    }

    static async find(workspaceId, userId) {
        return record(
            await Document.findOne({ workspaceId, userId }).exec(),
        );
    }

    static async listForUser(userId) {
        const memberships = await Document.find({ userId }).lean().exec();
        return memberships.map(record);
    }

    static async listMembers(workspaceId) {
        const memberships = await Document.find({ workspaceId })
            .populate("userId", "name email")
            .sort({ createdAt: 1 })
            .exec();
        return memberships.map(record);
    }

    static async updateRole(workspaceId, userId, role) {
        return record(
            await Document.findOneAndUpdate(
                { workspaceId, userId },
                { role },
                { new: true, runValidators: true },
            ).exec(),
        );
    }
}

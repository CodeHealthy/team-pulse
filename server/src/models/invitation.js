import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Workspace",
            index: true,
        },
        email: { type: String, required: true, lowercase: true, trim: true },
        role: {
            type: String,
            required: true,
            enum: ["admin", "member"],
            default: "member",
        },
        tokenHash: { type: String, required: true, unique: true },
        invitedBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
        expiresAt: { type: Date, required: true, expires: 0 },
        acceptedAt: { type: Date, default: null },
    },
    { timestamps: true, versionKey: false },
);

const Document = mongoose.models.Invitation ?? mongoose.model("Invitation", schema);

function record(document) {
    return document
        ? {
              id: document._id.toString(),
              workspaceId: document.workspaceId.toString(),
              email: document.email,
              role: document.role,
              invitedBy: document.invitedBy.toString(),
              expiresAt: document.expiresAt,
              acceptedAt: document.acceptedAt,
              createdAt: document.createdAt,
          }
        : null;
}

export class Invitation {
    static async create(values) {
        return record(await Document.create(values));
    }

    static async list(workspaceId) {
        return (await Document.find({ workspaceId }).sort({ createdAt: -1 }).exec()).map(record);
    }

    static async findPendingByHash(tokenHash) {
        return record(
            await Document.findOne({
                tokenHash,
                acceptedAt: null,
                expiresAt: { $gt: new Date() },
            }).exec(),
        );
    }

    static async accept(id) {
        return record(
            await Document.findByIdAndUpdate(
                id,
                { acceptedAt: new Date() },
                { new: true },
            ).exec(),
        );
    }
}

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

const InvitationModel = mongoose.models.Invitation ?? mongoose.model("Invitation", schema);

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

export const invitationRepository = Object.freeze({
    async create(values) {
        return record(await InvitationModel.create(values));
    },

    async listByWorkspaceId(workspaceId) {
        const invitations = await InvitationModel.find({ workspaceId }).sort({ createdAt: -1 }).lean().exec();
        return invitations.map(record);
    },

    async findPendingByTokenHash(tokenHash) {
        return record(
            await InvitationModel.findOne({
                tokenHash,
                acceptedAt: null,
                expiresAt: { $gt: new Date() },
            }).lean().exec(),
        );
    },

    async markAcceptedById(id) {
        return record(
            await InvitationModel.findByIdAndUpdate(
                id,
                { acceptedAt: new Date() },
                { new: true },
            ).lean().exec(),
        );
    },
});

export { InvitationModel };

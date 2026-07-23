import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User", index: true },
        workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace" },
        type: { type: String, required: true },
        title: { type: String, required: true, maxlength: 160 },
        body: { type: String, required: true, maxlength: 500 },
        entityType: { type: String, default: null },
        entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
        readAt: { type: Date, default: null },
    },
    { timestamps: true, versionKey: false },
);
const Document = mongoose.models.Notification ?? mongoose.model("Notification", schema);
const record = (d) => d && ({
    id: d._id.toString(), userId: d.userId.toString(), workspaceId: d.workspaceId.toString(),
    type: d.type, title: d.title, body: d.body, entityType: d.entityType,
    entityId: d.entityId?.toString() ?? null, readAt: d.readAt, createdAt: d.createdAt,
});

export class Notification {
    static async create(values) { return record(await Document.create(values)); }
    static async list(userId) { return (await Document.find({ userId }).sort({ createdAt: -1 }).limit(100).exec()).map(record); }
    static async read(id, userId) { return record(await Document.findOneAndUpdate({ _id: id, userId }, { readAt: new Date() }, { new: true }).exec()); }
    static async readAll(userId) { await Document.updateMany({ userId, readAt: null }, { readAt: new Date() }).exec(); }
}

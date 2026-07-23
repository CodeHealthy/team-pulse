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
const NotificationModel = mongoose.models.Notification ?? mongoose.model("Notification", schema);
const record = (d) => d && ({
    id: d._id.toString(), userId: d.userId.toString(), workspaceId: d.workspaceId.toString(),
    type: d.type, title: d.title, body: d.body, entityType: d.entityType,
    entityId: d.entityId?.toString() ?? null, readAt: d.readAt, createdAt: d.createdAt,
});

export const notificationRepository = Object.freeze({
    async create(values) { return record(await NotificationModel.create(values)); },
    async listByUserId(userId) {
        const notifications = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(100).lean().exec();
        return notifications.map(record);
    },
    async markReadById(id, userId) { return record(await NotificationModel.findOneAndUpdate({ _id: id, userId }, { $set: { readAt: new Date() } }, { new: true }).lean().exec()); },
    async markAllReadByUserId(userId) { await NotificationModel.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } }).exec(); },
});

export { NotificationModel };

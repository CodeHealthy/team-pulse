import mongoose from "mongoose";
const schema = new mongoose.Schema({
    workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace", index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    action: { type: String, required: true }, entityType: String, entityId: mongoose.Schema.Types.ObjectId,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, versionKey: false });
const ActivityLogModel = mongoose.models.ActivityLog ?? mongoose.model("ActivityLog", schema);
const record = (d) => ({ id: d._id.toString(), workspaceId: d.workspaceId.toString(), actorId: d.actorId._id ? d.actorId._id.toString() : d.actorId.toString(), actor: d.actorId.name ? { name: d.actorId.name } : null, action: d.action, entityType: d.entityType, entityId: d.entityId?.toString(), metadata: d.metadata, createdAt: d.createdAt });
export const activityLogRepository = Object.freeze({
    async create(values) { return record(await ActivityLogModel.create(values)); },
    async listByWorkspaceId(workspaceId) {
        const activity = await ActivityLogModel.find({ workspaceId }).populate("actorId", "name").sort({ createdAt: -1 }).limit(100).lean().exec();
        return activity.map(record);
    },
});

export { ActivityLogModel };

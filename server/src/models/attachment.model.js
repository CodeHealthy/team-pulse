import mongoose from "mongoose";
const schema = new mongoose.Schema({
    workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace" },
    taskId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Task", index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    originalName: String, storedName: String, mimeType: String, size: Number,
}, { timestamps: true, versionKey: false });
const AttachmentModel = mongoose.models.Attachment ?? mongoose.model("Attachment", schema);
const record = (d) => ({ id: d._id.toString(), taskId: d.taskId.toString(), originalName: d.originalName, mimeType: d.mimeType, size: d.size, url: `/uploads/${d.storedName}`, createdAt: d.createdAt });
export const attachmentRepository = Object.freeze({
    async create(values) { return record(await AttachmentModel.create(values)); },
    async listByTaskId(taskId) {
        const attachments = await AttachmentModel.find({ taskId }).lean().exec();
        return attachments.map(record);
    },
});

export { AttachmentModel };

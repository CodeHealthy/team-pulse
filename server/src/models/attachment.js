import mongoose from "mongoose";
const schema = new mongoose.Schema({
    workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace" },
    taskId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Task", index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    originalName: String, storedName: String, mimeType: String, size: Number,
}, { timestamps: true, versionKey: false });
const Document = mongoose.models.Attachment ?? mongoose.model("Attachment", schema);
const record = (d) => ({ id: d._id.toString(), taskId: d.taskId.toString(), originalName: d.originalName, mimeType: d.mimeType, size: d.size, url: `/uploads/${d.storedName}`, createdAt: d.createdAt });
export class Attachment {
    static async create(values) { return record(await Document.create(values)); }
    static async list(taskId) { return (await Document.find({ taskId }).exec()).map(record); }
}

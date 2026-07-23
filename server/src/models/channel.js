import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace", index: true },
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
        name: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
        description: { type: String, trim: true, maxlength: 300, default: "" },
        createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    },
    { timestamps: true, versionKey: false },
);
schema.index({ workspaceId: 1, name: 1 }, { unique: true });
const Document = mongoose.models.Channel ?? mongoose.model("Channel", schema);
const record = (d) => d && ({
    id: d._id.toString(), workspaceId: d.workspaceId.toString(),
    projectId: d.projectId?.toString() ?? null, name: d.name,
    description: d.description, createdBy: d.createdBy.toString(), createdAt: d.createdAt,
});

export class Channel {
    static async create(values) { return record(await Document.create(values)); }
    static async list(workspaceId) { return (await Document.find({ workspaceId }).sort({ name: 1 }).exec()).map(record); }
    static async findById(id) { return record(await Document.findById(id).exec()); }
}

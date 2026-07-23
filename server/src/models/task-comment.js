import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace", index: true },
        taskId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Task", index: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
        content: { type: String, required: true, trim: true, maxlength: 4000 },
    },
    { timestamps: true, versionKey: false },
);
const Document = mongoose.models.TaskComment ?? mongoose.model("TaskComment", schema);
const record = (d) => d && ({
    id: d._id.toString(), workspaceId: d.workspaceId.toString(),
    taskId: d.taskId.toString(),
    authorId: d.authorId._id ? d.authorId._id.toString() : d.authorId.toString(),
    author: d.authorId.name ? { id: d.authorId._id.toString(), name: d.authorId.name } : null,
    content: d.content, createdAt: d.createdAt,
});

export class TaskComment {
    static async create(values) {
        const comment = await Document.create(values);
        await comment.populate("authorId", "name");
        return record(comment);
    }
    static async list(taskId) {
        return (await Document.find({ taskId }).populate("authorId", "name").sort({ createdAt: 1 }).exec()).map(record);
    }
}

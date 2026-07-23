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
const TaskCommentModel = mongoose.models.TaskComment ?? mongoose.model("TaskComment", schema);
const record = (d) => d && ({
    id: d._id.toString(), workspaceId: d.workspaceId.toString(),
    taskId: d.taskId.toString(),
    authorId: d.authorId._id ? d.authorId._id.toString() : d.authorId.toString(),
    author: d.authorId.name ? { id: d.authorId._id.toString(), name: d.authorId.name } : null,
    content: d.content, createdAt: d.createdAt,
});

export const taskCommentRepository = Object.freeze({
    async create(values) {
        const comment = await TaskCommentModel.create(values);
        await comment.populate("authorId", "name");
        return record(comment);
    },
    async listByTaskId(taskId) {
        const comments = await TaskCommentModel.find({ taskId }).populate("authorId", "name").sort({ createdAt: 1 }).lean().exec();
        return comments.map(record);
    },
});

export { TaskCommentModel };

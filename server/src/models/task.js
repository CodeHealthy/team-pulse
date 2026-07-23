import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace", index: true },
        projectId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Project", index: true },
        boardId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Board", index: true },
        columnId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "BoardColumn", index: true },
        title: { type: String, required: true, trim: true, maxlength: 160 },
        description: { type: String, trim: true, maxlength: 5000, default: "" },
        priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
        labels: [{ type: String, trim: true, maxlength: 30 }],
        assigneeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        dueDate: { type: Date, default: null },
        position: { type: Number, required: true, min: 0 },
        createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    },
    { timestamps: true, versionKey: false },
);
schema.index({ columnId: 1, position: 1 });
const Document = mongoose.models.Task ?? mongoose.model("Task", schema);

function record(d) {
    return d && {
        id: d._id.toString(), workspaceId: d.workspaceId.toString(),
        projectId: d.projectId.toString(), boardId: d.boardId.toString(),
        columnId: d.columnId.toString(), title: d.title,
        description: d.description, priority: d.priority, labels: d.labels,
        assigneeIds: d.assigneeIds.map(String), dueDate: d.dueDate,
        position: d.position, createdBy: d.createdBy.toString(),
        createdAt: d.createdAt, updatedAt: d.updatedAt,
    };
}

export class Task {
    static async create(values) { return record(await Document.create(values)); }
    static async list(boardId) { return (await Document.find({ boardId }).sort({ position: 1 }).exec()).map(record); }
    static async findById(id) { return record(await Document.findById(id).exec()); }
    static async update(id, changes) { return record(await Document.findByIdAndUpdate(id, changes, { new: true, runValidators: true }).exec()); }
    static async remove(id) { return Boolean(await Document.findByIdAndDelete(id).exec()); }
    static async removeFromColumn(columnId) { await Document.deleteMany({ columnId }).exec(); }
    static async nextPosition(columnId) { return await Document.countDocuments({ columnId }); }
    static async search(workspaceId, query) {
        return (await Document.find({ workspaceId, $or: [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
            { labels: { $regex: query, $options: "i" } },
        ] }).limit(50).exec()).map(record);
    }
    static async calendar(workspaceId, from, to) {
        return (await Document.find({ workspaceId, dueDate: { $gte: from, $lte: to } }).sort({ dueDate: 1 }).exec()).map(record);
    }
    static async analytics(workspaceId) {
        const [total, overdue, priorities] = await Promise.all([
            Document.countDocuments({ workspaceId }),
            Document.countDocuments({ workspaceId, dueDate: { $lt: new Date() } }),
            Document.aggregate([{ $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } }, { $group: { _id: "$priority", count: { $sum: 1 } } }]),
        ]);
        return { totalTasks: total, overdueTasks: overdue, byPriority: Object.fromEntries(priorities.map((item) => [item._id, item.count])) };
    }
}

import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace", index: true },
        projectId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Project", index: true },
        boardId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Board", index: true },
        name: { type: String, required: true, trim: true, maxlength: 60 },
        position: { type: Number, required: true, min: 0 },
    },
    { timestamps: true, versionKey: false },
);
schema.index({ boardId: 1, position: 1 });
const Document = mongoose.models.BoardColumn ?? mongoose.model("BoardColumn", schema);
const record = (d) => d && ({
    id: d._id.toString(), workspaceId: d.workspaceId.toString(),
    projectId: d.projectId.toString(), boardId: d.boardId.toString(),
    name: d.name, position: d.position,
});

export class BoardColumn {
    static async create(values) { return record(await Document.create(values)); }
    static async createMany(values) { return (await Document.insertMany(values)).map(record); }
    static async list(boardId) { return (await Document.find({ boardId }).sort({ position: 1 }).exec()).map(record); }
    static async findById(id) { return record(await Document.findById(id).exec()); }
    static async update(id, changes) { return record(await Document.findByIdAndUpdate(id, changes, { new: true, runValidators: true }).exec()); }
    static async remove(id) { return Boolean(await Document.findByIdAndDelete(id).exec()); }
    static async nextPosition(boardId) { return await Document.countDocuments({ boardId }); }
}

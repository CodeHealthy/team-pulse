import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace", index: true },
        projectId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Project", unique: true },
        name: { type: String, required: true, trim: true, default: "Main board" },
    },
    { timestamps: true, versionKey: false },
);
const Document = mongoose.models.Board ?? mongoose.model("Board", schema);
const record = (d) => d && ({
    id: d._id.toString(), workspaceId: d.workspaceId.toString(),
    projectId: d.projectId.toString(), name: d.name,
});

export class Board {
    static async create(values) { return record(await Document.create(values)); }
    static async findByProject(projectId) { return record(await Document.findOne({ projectId }).exec()); }
    static async findById(id) { return record(await Document.findById(id).exec()); }
}

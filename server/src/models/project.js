import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace", index: true },
        name: { type: String, required: true, trim: true, maxlength: 100 },
        description: { type: String, trim: true, maxlength: 1000, default: "" },
        color: { type: String, default: "#4F7CFF" },
        status: { type: String, enum: ["active", "archived"], default: "active" },
        createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    },
    { timestamps: true, versionKey: false },
);

const Document = mongoose.models.Project ?? mongoose.model("Project", schema);

function record(document) {
    return document
        ? {
              id: document._id.toString(),
              workspaceId: document.workspaceId.toString(),
              name: document.name,
              description: document.description,
              color: document.color,
              status: document.status,
              createdBy: document.createdBy.toString(),
              createdAt: document.createdAt,
              updatedAt: document.updatedAt,
          }
        : null;
}

export class Project {
    static async create(values) {
        return record(await Document.create(values));
    }
    static async list(workspaceId) {
        return (await Document.find({ workspaceId }).sort({ updatedAt: -1 }).exec()).map(record);
    }
    static async findById(id) {
        return record(await Document.findById(id).exec());
    }
    static async update(id, changes) {
        return record(await Document.findByIdAndUpdate(id, changes, { new: true, runValidators: true }).exec());
    }
    static async search(workspaceId, query) {
        return (await Document.find({ workspaceId, $or: [
            { name: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ] }).limit(25).exec()).map(record);
    }
}

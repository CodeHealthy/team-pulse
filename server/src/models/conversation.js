import mongoose from "mongoose";

const schema = new mongoose.Schema({
    workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace", index: true },
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" }],
}, { timestamps: true, versionKey: false });
const Document = mongoose.models.Conversation ?? mongoose.model("Conversation", schema);
const record = (d) => d && ({ id: d._id.toString(), workspaceId: d.workspaceId.toString(), participantIds: d.participantIds.map(String), updatedAt: d.updatedAt });

export class Conversation {
    static async findOrCreate(workspaceId, participantIds) {
        const sorted = [...participantIds].sort();
        let item = await Document.findOne({ workspaceId, participantIds: { $all: sorted, $size: sorted.length } }).exec();
        item ??= await Document.create({ workspaceId, participantIds: sorted });
        return record(item);
    }
    static async list(userId) { return (await Document.find({ participantIds: userId }).sort({ updatedAt: -1 }).exec()).map(record); }
    static async findById(id) { return record(await Document.findById(id).exec()); }
    static async touch(id) { await Document.updateOne({ _id: id }, { updatedAt: new Date() }).exec(); }
}

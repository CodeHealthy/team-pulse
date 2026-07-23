import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace", index: true },
        channelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Channel", index: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
        content: { type: String, required: true, trim: true, maxlength: 5000 },
    },
    { timestamps: true, versionKey: false },
);
schema.index({ channelId: 1, createdAt: -1 });
const Document = mongoose.models.Message ?? mongoose.model("Message", schema);
const record = (d) => d && ({
    id: d._id.toString(), workspaceId: d.workspaceId.toString(),
    channelId: d.channelId.toString(),
    authorId: d.authorId._id ? d.authorId._id.toString() : d.authorId.toString(),
    author: d.authorId.name ? { id: d.authorId._id.toString(), name: d.authorId.name } : null,
    content: d.content, createdAt: d.createdAt,
});

export class Message {
    static async create(values) {
        const message = await Document.create(values);
        await message.populate("authorId", "name");
        return record(message);
    }
    static async list(channelId, limit = 50) {
        const items = await Document.find({ channelId }).populate("authorId", "name").sort({ createdAt: -1 }).limit(limit).exec();
        return items.reverse().map(record);
    }
    static async countSince(channelId, since) {
        return Document.countDocuments({ channelId, createdAt: { $gt: since } });
    }
}

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
const MessageModel = mongoose.models.Message ?? mongoose.model("Message", schema);
const record = (d) => d && ({
    id: d._id.toString(), workspaceId: d.workspaceId.toString(),
    channelId: d.channelId.toString(),
    authorId: d.authorId._id ? d.authorId._id.toString() : d.authorId.toString(),
    author: d.authorId.name ? { id: d.authorId._id.toString(), name: d.authorId.name } : null,
    content: d.content, createdAt: d.createdAt,
});

export const messageRepository = Object.freeze({
    async create(values) {
        const message = await MessageModel.create(values);
        await message.populate("authorId", "name");
        return record(message);
    },
    async listByChannelId(channelId, limit = 50) {
        const items = await MessageModel.find({ channelId }).populate("authorId", "name").sort({ createdAt: -1 }).limit(limit).lean().exec();
        return items.reverse().map(record);
    },
    async countByChannelSince(channelId, since) {
        return MessageModel.countDocuments({ channelId, createdAt: { $gt: since } });
    },
});

export { MessageModel };

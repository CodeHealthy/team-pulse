import mongoose from "mongoose";
const schema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Conversation", index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
}, { timestamps: true, versionKey: false });
const DirectMessageModel = mongoose.models.DirectMessage ?? mongoose.model("DirectMessage", schema);
const record = (d) => d && ({ id: d._id.toString(), conversationId: d.conversationId.toString(), authorId: d.authorId._id ? d.authorId._id.toString() : d.authorId.toString(), author: d.authorId.name ? { id: d.authorId._id.toString(), name: d.authorId.name } : null, content: d.content, createdAt: d.createdAt });
export const directMessageRepository = Object.freeze({
    async create(values) { const message = await DirectMessageModel.create(values); await message.populate("authorId", "name"); return record(message); },
    async listByConversationId(conversationId) {
        const messages = await DirectMessageModel.find({ conversationId }).populate("authorId", "name").sort({ createdAt: 1 }).limit(100).lean().exec();
        return messages.map(record);
    },
});

export { DirectMessageModel };

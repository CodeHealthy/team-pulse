import mongoose from "mongoose";
const schema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Conversation", index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
}, { timestamps: true, versionKey: false });
const Document = mongoose.models.DirectMessage ?? mongoose.model("DirectMessage", schema);
const record = (d) => d && ({ id: d._id.toString(), conversationId: d.conversationId.toString(), authorId: d.authorId._id ? d.authorId._id.toString() : d.authorId.toString(), author: d.authorId.name ? { id: d.authorId._id.toString(), name: d.authorId.name } : null, content: d.content, createdAt: d.createdAt });
export class DirectMessage {
    static async create(values) { const d = await Document.create(values); await d.populate("authorId", "name"); return record(d); }
    static async list(conversationId) { return (await Document.find({ conversationId }).populate("authorId", "name").sort({ createdAt: 1 }).limit(100).exec()).map(record); }
}

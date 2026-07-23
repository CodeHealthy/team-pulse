import mongoose from "mongoose";

const schema = new mongoose.Schema({
    workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Workspace", index: true },
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" }],
}, { timestamps: true, versionKey: false });
const ConversationModel = mongoose.models.Conversation ?? mongoose.model("Conversation", schema);
const record = (d) => d && ({ id: d._id.toString(), workspaceId: d.workspaceId.toString(), participantIds: d.participantIds.map(String), updatedAt: d.updatedAt });

export const conversationRepository = Object.freeze({
    async findOrCreate(workspaceId, participantIds) {
        const sorted = [...participantIds].sort();
        let item = await ConversationModel.findOne({ workspaceId, participantIds: { $all: sorted, $size: sorted.length } }).lean().exec();
        item ??= await ConversationModel.create({ workspaceId, participantIds: sorted });
        return record(item);
    },
    async listByUserId(userId) {
        const conversations = await ConversationModel.find({ participantIds: userId }).sort({ updatedAt: -1 }).lean().exec();
        return conversations.map(record);
    },
    async findById(id) { return record(await ConversationModel.findById(id).lean().exec()); },
    async touchById(id) { await ConversationModel.updateOne({ _id: id }, { $set: { updatedAt: new Date() } }).exec(); },
});

export { ConversationModel };

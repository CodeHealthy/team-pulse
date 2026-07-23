import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        channelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Channel" },
        userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
        lastReadAt: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true, versionKey: false },
);
schema.index({ channelId: 1, userId: 1 }, { unique: true });
const Document = mongoose.models.ChannelRead ?? mongoose.model("ChannelRead", schema);

export class ChannelRead {
    static async find(channelId, userId) { return Document.findOne({ channelId, userId }).lean().exec(); }
    static async mark(channelId, userId) {
        await Document.updateOne({ channelId, userId }, { lastReadAt: new Date() }, { upsert: true }).exec();
    }
}

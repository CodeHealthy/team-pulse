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
const ChannelReadModel = mongoose.models.ChannelRead ?? mongoose.model("ChannelRead", schema);

export const channelReadRepository = Object.freeze({
    async findByChannelAndUser(channelId, userId) {
        return ChannelReadModel.findOne({ channelId, userId }).lean().exec();
    },
    async markRead(channelId, userId) {
        await ChannelReadModel.updateOne({ channelId, userId }, { $set: { lastReadAt: new Date() } }, { upsert: true }).exec();
    },
});

export { ChannelReadModel };

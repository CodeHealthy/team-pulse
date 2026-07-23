import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 80 },
        slug: { type: String, required: true, unique: true, trim: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    },
    { timestamps: true, versionKey: false },
);

const Document = mongoose.models.Workspace ?? mongoose.model("Workspace", schema);

function record(document) {
    return document
        ? {
              id: document.id,
              name: document.name,
              slug: document.slug,
              createdBy: document.createdBy.toString(),
              createdAt: document.createdAt,
              updatedAt: document.updatedAt,
          }
        : null;
}

export class Workspace {
    static async create(values) {
        return record(await Document.create(values));
    }

    static async findById(id) {
        return record(await Document.findById(id).exec());
    }

    static async findMany(ids) {
        return (
            await Document.find({
                _id: { $in: ids },
            }).exec()
        ).map(record);
    }

    static async slugExists(slug) {
        return Boolean(await Document.exists({ slug }));
    }

    static async update(id, changes) {
        return record(
            await Document.findByIdAndUpdate(id, changes, {
                new: true,
                runValidators: true,
            }).exec(),
        );
    }

    static async remove(id) {
        await Document.findByIdAndDelete(id).exec();
    }
}

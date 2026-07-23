import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

const WorkspaceModel =
    mongoose.models.Workspace ??
    mongoose.model(
        "Workspace",
        workspaceSchema,
    );

function toWorkspace(workspace) {
    if (!workspace) {
        return null;
    }

    return {
        id: workspace._id.toString(),
        name: workspace.name,
        slug: workspace.slug,
        createdBy: workspace.createdBy.toString(),
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
    };
}

export const workspaceRepository = Object.freeze({
    async create(values) {
        return toWorkspace(
            await WorkspaceModel.create(values),
        );
    },

    async findById(id) {
        return toWorkspace(
            await WorkspaceModel.findById(id)
                .lean()
                .exec(),
        );
    },

    async findByIds(ids) {
        const workspaces = await WorkspaceModel.find({
            _id: { $in: ids },
        })
            .lean()
            .exec();

        return workspaces.map(toWorkspace);
    },

    async existsBySlug(slug) {
        return Boolean(
            await WorkspaceModel.exists({ slug }),
        );
    },

    async updateById(id, changes) {
        const update = {};

        if (changes.name !== undefined) {
            update.name = changes.name;
        }

        return toWorkspace(
            await WorkspaceModel.findByIdAndUpdate(
                id,
                { $set: update },
                {
                    new: true,
                    runValidators: true,
                },
            )
                .lean()
                .exec(),
        );
    },

    async deleteById(id) {
        const result =
            await WorkspaceModel.deleteOne({
                _id: id,
            }).exec();

        return result.deletedCount === 1;
    },
});

export { WorkspaceModel };

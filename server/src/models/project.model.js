import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Workspace",
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: "",
        },
        color: {
            type: String,
            default: "#4F7CFF",
        },
        status: {
            type: String,
            enum: ["active", "archived"],
            default: "active",
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

const ProjectModel =
    mongoose.models.Project ??
    mongoose.model("Project", projectSchema);

function toProject(project) {
    if (!project) {
        return null;
    }

    return {
        id: project._id.toString(),
        workspaceId: project.workspaceId.toString(),
        name: project.name,
        description: project.description,
        color: project.color,
        status: project.status,
        createdBy: project.createdBy.toString(),
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
    };
}

function sanitizeUpdates(changes) {
    const update = {};

    for (const field of [
        "name",
        "description",
        "color",
        "status",
    ]) {
        if (changes[field] !== undefined) {
            update[field] = changes[field];
        }
    }

    return update;
}

export const projectRepository = Object.freeze({
    async create(values) {
        return toProject(
            await ProjectModel.create(values),
        );
    },

    async listByWorkspaceId(workspaceId) {
        const projects = await ProjectModel.find({
            workspaceId,
        })
            .sort({ updatedAt: -1 })
            .lean()
            .exec();

        return projects.map(toProject);
    },

    async findById(id) {
        return toProject(
            await ProjectModel.findById(id)
                .lean()
                .exec(),
        );
    },

    async updateById(id, changes) {
        return toProject(
            await ProjectModel.findByIdAndUpdate(
                id,
                {
                    $set: sanitizeUpdates(changes),
                },
                {
                    new: true,
                    runValidators: true,
                },
            )
                .lean()
                .exec(),
        );
    },

    async searchByWorkspaceId(
        workspaceId,
        query,
    ) {
        const projects = await ProjectModel.find({
            workspaceId,
            $or: [
                {
                    name: {
                        $regex: query,
                        $options: "i",
                    },
                },
                {
                    description: {
                        $regex: query,
                        $options: "i",
                    },
                },
            ],
        })
            .limit(25)
            .lean()
            .exec();

        return projects.map(toProject);
    },
});

export { ProjectModel };

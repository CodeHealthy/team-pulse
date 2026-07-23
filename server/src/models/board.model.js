import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
    {
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Workspace",
            index: true,
        },
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Project",
            unique: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            default: "Main board",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

const BoardModel =
    mongoose.models.Board ??
    mongoose.model("Board", boardSchema);

function toBoard(board) {
    if (!board) {
        return null;
    }

    return {
        id: board._id.toString(),
        workspaceId: board.workspaceId.toString(),
        projectId: board.projectId.toString(),
        name: board.name,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
    };
}

export const boardRepository = Object.freeze({
    async create(values) {
        return toBoard(
            await BoardModel.create(values),
        );
    },

    async findByProjectId(projectId) {
        return toBoard(
            await BoardModel.findOne({ projectId })
                .lean()
                .exec(),
        );
    },

    async findById(id) {
        return toBoard(
            await BoardModel.findById(id)
                .lean()
                .exec(),
        );
    },
});

export { BoardModel };

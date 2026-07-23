import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const boardColumnSchema = new mongoose.Schema(
    {
        workspaceId: {
            type: ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        projectId: {
            type: ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        boardId: {
            type: ObjectId,
            ref: "Board",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60,
        },
        position: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

boardColumnSchema.index(
    { boardId: 1, position: 1 },
    { unique: true },
);

const BoardColumnModel =
    mongoose.models.BoardColumn ??
    mongoose.model(
        "BoardColumn",
        boardColumnSchema,
    );

function toBoardColumn(column) {
    if (!column) {
        return null;
    }

    return {
        id: column._id.toString(),
        workspaceId: column.workspaceId.toString(),
        projectId: column.projectId.toString(),
        boardId: column.boardId.toString(),
        name: column.name,
        position: column.position,
        createdAt: column.createdAt,
        updatedAt: column.updatedAt,
    };
}

function sanitizeUpdates(changes) {
    const update = {};

    if (changes.name !== undefined) {
        update.name = changes.name;
    }

    if (changes.position !== undefined) {
        update.position = changes.position;
    }

    return update;
}

export const boardColumnRepository = Object.freeze({
    async create(values) {
        return toBoardColumn(
            await BoardColumnModel.create(values),
        );
    },

    async createMany(values) {
        const columns =
            await BoardColumnModel.insertMany(values);

        return columns.map(toBoardColumn);
    },

    async listByBoardId(boardId) {
        const columns = await BoardColumnModel.find({
            boardId,
        })
            .sort({ position: 1 })
            .lean()
            .exec();

        return columns.map(toBoardColumn);
    },

    async findById(id) {
        return toBoardColumn(
            await BoardColumnModel.findById(id)
                .lean()
                .exec(),
        );
    },

    async updateById(id, changes) {
        return toBoardColumn(
            await BoardColumnModel.findByIdAndUpdate(
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

    async deleteById(id) {
        const result =
            await BoardColumnModel.deleteOne({
                _id: id,
            }).exec();

        return result.deletedCount === 1;
    },

    async getNextPosition(boardId) {
        const lastColumn =
            await BoardColumnModel.findOne({
                boardId,
            })
                .sort({ position: -1 })
                .select({ position: 1 })
                .lean()
                .exec();

        return lastColumn
            ? lastColumn.position + 1
            : 0;
    },
});

export { BoardColumnModel };

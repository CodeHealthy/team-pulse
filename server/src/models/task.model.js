import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const taskSchema = new mongoose.Schema(
    {
        workspaceId: {
            type: ObjectId,
            required: true,
            ref: "Workspace",
            index: true,
        },
        projectId: {
            type: ObjectId,
            required: true,
            ref: "Project",
            index: true,
        },
        boardId: {
            type: ObjectId,
            required: true,
            ref: "Board",
            index: true,
        },
        columnId: {
            type: ObjectId,
            required: true,
            ref: "BoardColumn",
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 5000,
            default: "",
        },
        priority: {
            type: String,
            enum: [
                "low",
                "medium",
                "high",
                "urgent",
            ],
            default: "medium",
        },
        labels: [
            {
                type: String,
                trim: true,
                maxlength: 30,
            },
        ],
        assigneeIds: [
            {
                type: ObjectId,
                ref: "User",
            },
        ],
        dueDate: {
            type: Date,
            default: null,
        },
        position: {
            type: Number,
            required: true,
            min: 0,
        },
        createdBy: {
            type: ObjectId,
            required: true,
            ref: "User",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

taskSchema.index(
    { columnId: 1, position: 1 },
    { unique: true },
);

const TaskModel =
    mongoose.models.Task ??
    mongoose.model("Task", taskSchema);

function toTask(task) {
    if (!task) {
        return null;
    }

    return {
        id: task._id.toString(),
        workspaceId: task.workspaceId.toString(),
        projectId: task.projectId.toString(),
        boardId: task.boardId.toString(),
        columnId: task.columnId.toString(),
        title: task.title,
        description: task.description,
        priority: task.priority,
        labels: task.labels,
        assigneeIds: task.assigneeIds.map(String),
        dueDate: task.dueDate,
        position: task.position,
        createdBy: task.createdBy.toString(),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
    };
}

function sanitizeUpdates(changes) {
    const allowedFields = [
        "columnId",
        "title",
        "description",
        "priority",
        "labels",
        "assigneeIds",
        "dueDate",
        "position",
    ];
    const update = {};

    for (const field of allowedFields) {
        if (changes[field] !== undefined) {
            update[field] = changes[field];
        }
    }

    return update;
}

export const taskRepository = Object.freeze({
    async create(values) {
        return toTask(
            await TaskModel.create(values),
        );
    },

    async listByBoardId(boardId) {
        const tasks = await TaskModel.find({
            boardId,
        })
            .sort({ position: 1 })
            .lean()
            .exec();

        return tasks.map(toTask);
    },

    async findById(id) {
        return toTask(
            await TaskModel.findById(id)
                .lean()
                .exec(),
        );
    },

    async updateById(id, changes) {
        return toTask(
            await TaskModel.findByIdAndUpdate(
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
        const result = await TaskModel.deleteOne({
            _id: id,
        }).exec();

        return result.deletedCount === 1;
    },

    async deleteByColumnId(columnId) {
        const result = await TaskModel.deleteMany({
            columnId,
        }).exec();

        return result.deletedCount;
    },

    async getNextPosition(columnId) {
        const lastTask = await TaskModel.findOne({
            columnId,
        })
            .sort({ position: -1 })
            .select({ position: 1 })
            .lean()
            .exec();

        return lastTask
            ? lastTask.position + 1
            : 0;
    },

    async searchByWorkspaceId(
        workspaceId,
        query,
    ) {
        const tasks = await TaskModel.find({
            workspaceId,
            $or: [
                {
                    title: {
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
                {
                    labels: {
                        $regex: query,
                        $options: "i",
                    },
                },
            ],
        })
            .limit(50)
            .lean()
            .exec();

        return tasks.map(toTask);
    },

    async listCalendarByWorkspaceId(
        workspaceId,
        from,
        to,
    ) {
        const tasks = await TaskModel.find({
            workspaceId,
            dueDate: {
                $gte: from,
                $lte: to,
            },
        })
            .sort({ dueDate: 1 })
            .lean()
            .exec();

        return tasks.map(toTask);
    },

    async getAnalyticsByWorkspaceId(
        workspaceId,
    ) {
        const objectId =
            new mongoose.Types.ObjectId(
                workspaceId,
            );
        const [total, overdue, priorities] =
            await Promise.all([
                TaskModel.countDocuments({
                    workspaceId,
                }),
                TaskModel.countDocuments({
                    workspaceId,
                    dueDate: { $lt: new Date() },
                }),
                TaskModel.aggregate([
                    {
                        $match: {
                            workspaceId: objectId,
                        },
                    },
                    {
                        $group: {
                            _id: "$priority",
                            count: { $sum: 1 },
                        },
                    },
                ]),
            ]);

        return {
            totalTasks: total,
            overdueTasks: overdue,
            byPriority: Object.fromEntries(
                priorities.map((item) => [
                    item._id,
                    item.count,
                ]),
            ),
        };
    },
});

export { TaskModel };

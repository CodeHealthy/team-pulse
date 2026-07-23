import mongoose from "mongoose";

const workspaceMemberSchema =
    new mongoose.Schema(
        {
            workspaceId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: "Workspace",
                index: true,
            },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: "User",
                index: true,
            },
            role: {
                type: String,
                required: true,
                enum: [
                    "owner",
                    "admin",
                    "member",
                ],
                default: "member",
            },
        },
        {
            timestamps: true,
            versionKey: false,
        },
    );

workspaceMemberSchema.index(
    {
        workspaceId: 1,
        userId: 1,
    },
    { unique: true },
);

const WorkspaceMemberModel =
    mongoose.models.WorkspaceMember ??
    mongoose.model(
        "WorkspaceMember",
        workspaceMemberSchema,
    );

function toWorkspaceMember(membership) {
    if (!membership) {
        return null;
    }

    const populatedUser =
        membership.userId &&
        typeof membership.userId === "object" &&
        membership.userId.name
            ? {
                  id: membership.userId._id.toString(),
                  name: membership.userId.name,
                  ...((membership.userId
                      .privacySettings
                      ?.showEmailToWorkspaceMembers ??
                  true)
                      ? {
                            email: membership
                                .userId.email,
                        }
                      : {}),
                  jobTitle:
                      membership.userId
                          .jobTitle ?? "",
              }
            : null;

    return {
        id: membership._id.toString(),
        workspaceId:
            membership.workspaceId.toString(),
        userId: populatedUser
            ? populatedUser.id
            : membership.userId.toString(),
        role: membership.role,
        user: populatedUser,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
    };
}

export const workspaceMemberRepository =
    Object.freeze({
        async create(values) {
            return toWorkspaceMember(
                await WorkspaceMemberModel.create(
                    values,
                ),
            );
        },

        async findByWorkspaceAndUser(
            workspaceId,
            userId,
        ) {
            return toWorkspaceMember(
                await WorkspaceMemberModel.findOne({
                    workspaceId,
                    userId,
                })
                    .lean()
                    .exec(),
            );
        },

        async listByUserId(userId) {
            const memberships =
                await WorkspaceMemberModel.find({
                    userId,
                })
                    .lean()
                    .exec();

            return memberships.map(
                toWorkspaceMember,
            );
        },

        async listByWorkspaceId(workspaceId) {
            const memberships =
                await WorkspaceMemberModel.find({
                    workspaceId,
                })
                    .populate(
                        "userId",
                        "name email jobTitle privacySettings.showEmailToWorkspaceMembers",
                    )
                    .sort({ createdAt: 1 })
                    .lean()
                    .exec();

            return memberships.map(
                toWorkspaceMember,
            );
        },

        async updateRole(
            workspaceId,
            userId,
            role,
        ) {
            return toWorkspaceMember(
                await WorkspaceMemberModel.findOneAndUpdate(
                    {
                        workspaceId,
                        userId,
                    },
                    { $set: { role } },
                    {
                        new: true,
                        runValidators: true,
                    },
                )
                    .lean()
                    .exec(),
            );
        },
    });

export { WorkspaceMemberModel };

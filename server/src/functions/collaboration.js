import { z } from "zod";

import { SOCKET_EVENTS } from "@teampulse/contracts/socket-events";

import { HTTP_STATUS } from "../core/http/http-status.js";
import {
    notFound,
    requireWorkspaceAccess,
} from "./access.js";

const id = z.string().regex(/^[a-f\d]{24}$/i);
const empty = z.object({});

export const taskCommentsSchema = z.object({
    body: empty,
    params: z.object({ taskId: id }),
    query: empty,
});
export const createCommentSchema = z.object({
    body: z.object({
        content: z.string().trim().min(1).max(4000),
    }),
    params: z.object({ taskId: id }),
    query: empty,
});
export const workspaceChannelsSchema = z.object({
    body: empty,
    params: z.object({ workspaceId: id }),
    query: empty,
});
export const createChannelSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(60).transform((v) => v.toLowerCase().replace(/[^a-z0-9-]+/g, "-")),
        description: z.string().trim().max(300).default(""),
        projectId: id.nullable().default(null),
    }),
    params: z.object({ workspaceId: id }),
    query: empty,
});
export const channelSchema = z.object({
    body: empty,
    params: z.object({ channelId: id }),
    query: empty,
});
export const createMessageSchema = z.object({
    body: z.object({
        content: z.string().trim().min(1).max(5000),
    }),
    params: z.object({ channelId: id }),
    query: empty,
});
export const notificationIdSchema = z.object({
    body: empty,
    params: z.object({ notificationId: id }),
    query: empty,
});

export function createCollaborationFunctions({
    TaskModel,
    TaskCommentModel,
    ChannelModel,
    MessageModel,
    ChannelReadModel,
    NotificationModel,
    WorkspaceMemberModel,
    bus,
}) {
    async function taskAccess(taskId, userId) {
        const task = await TaskModel.findById(taskId);
        if (!task) throw notFound("Task");
        await requireWorkspaceAccess({
            WorkspaceMemberModel,
            workspaceId: task.workspaceId,
            userId,
        });
        return task;
    }

    async function channelAccess(channelId, userId) {
        const channel = await ChannelModel.findById(channelId);
        if (!channel) throw notFound("Channel");
        await requireWorkspaceAccess({
            WorkspaceMemberModel,
            workspaceId: channel.workspaceId,
            userId,
        });
        return channel;
    }

    async function listComments(request, response, next) {
        try {
            await taskAccess(request.validated.params.taskId, request.auth.user.id);
            return response.json({
                success: true,
                data: { comments: await TaskCommentModel.list(request.validated.params.taskId) },
            });
        } catch (error) { return next(error); }
    }

    async function createComment(request, response, next) {
        try {
            const task = await taskAccess(request.validated.params.taskId, request.auth.user.id);
            const comment = await TaskCommentModel.create({
                workspaceId: task.workspaceId,
                taskId: task.id,
                authorId: request.auth.user.id,
                content: request.validated.body.content,
            });
            bus.emitWorkspace(task.workspaceId, SOCKET_EVENTS.COMMENT.CREATED, { comment });

            const recipients = new Set([task.createdBy, ...task.assigneeIds]);
            const mentions = request.validated.body.content.match(/@[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) ?? [];
            if (mentions.length) {
                const members = await WorkspaceMemberModel.listMembers(task.workspaceId);
                for (const member of members) {
                    if (mentions.some((mention) => mention.slice(1).toLowerCase() === member.user?.email.toLowerCase())) {
                        recipients.add(member.userId);
                    }
                }
            }
            recipients.delete(request.auth.user.id);
            for (const userId of recipients) {
                const notification = await NotificationModel.create({
                    userId, workspaceId: task.workspaceId, type: "task_comment",
                    title: "New task comment", body: `${request.auth.user.name} commented on ${task.title}`,
                    entityType: "task", entityId: task.id,
                });
                bus.emitUser(userId, SOCKET_EVENTS.NOTIFICATION.CREATED, { notification });
            }
            return response.status(HTTP_STATUS.CREATED).json({ success: true, data: { comment } });
        } catch (error) { return next(error); }
    }

    async function listChannels(request, response, next) {
        try {
            const { workspaceId } = request.validated.params;
            await requireWorkspaceAccess({ WorkspaceMemberModel, workspaceId, userId: request.auth.user.id });
            const channels = await ChannelModel.list(workspaceId);
            const enriched = await Promise.all(channels.map(async (channel) => {
                const read = await ChannelReadModel.find(channel.id, request.auth.user.id);
                return { ...channel, unreadCount: await MessageModel.countSince(channel.id, read?.lastReadAt ?? new Date(0)) };
            }));
            return response.json({ success: true, data: { channels: enriched } });
        } catch (error) { return next(error); }
    }

    async function createChannel(request, response, next) {
        try {
            const { workspaceId } = request.validated.params;
            await requireWorkspaceAccess({ WorkspaceMemberModel, workspaceId, userId: request.auth.user.id });
            const channel = await ChannelModel.create({
                ...request.validated.body, workspaceId, createdBy: request.auth.user.id,
            });
            return response.status(HTTP_STATUS.CREATED).json({ success: true, data: { channel: { ...channel, unreadCount: 0 } } });
        } catch (error) { return next(error); }
    }

    async function listMessages(request, response, next) {
        try {
            const { channelId } = request.validated.params;
            await channelAccess(channelId, request.auth.user.id);
            await ChannelReadModel.mark(channelId, request.auth.user.id);
            return response.json({ success: true, data: { messages: await MessageModel.list(channelId) } });
        } catch (error) { return next(error); }
    }

    async function createMessage(request, response, next) {
        try {
            const { channelId } = request.validated.params;
            const channel = await channelAccess(channelId, request.auth.user.id);
            const message = await MessageModel.create({
                workspaceId: channel.workspaceId, channelId,
                authorId: request.auth.user.id, content: request.validated.body.content,
            });
            await ChannelReadModel.mark(channelId, request.auth.user.id);
            bus.emitWorkspace(channel.workspaceId, SOCKET_EVENTS.MESSAGE.CREATED, { message });
            return response.status(HTTP_STATUS.CREATED).json({ success: true, data: { message } });
        } catch (error) { return next(error); }
    }

    async function markChannelRead(request, response, next) {
        try {
            const { channelId } = request.validated.params;
            await channelAccess(channelId, request.auth.user.id);
            await ChannelReadModel.mark(channelId, request.auth.user.id);
            return response.status(HTTP_STATUS.NO_CONTENT).send();
        } catch (error) { return next(error); }
    }

    async function listNotifications(request, response, next) {
        try {
            return response.json({ success: true, data: { notifications: await NotificationModel.list(request.auth.user.id) } });
        } catch (error) { return next(error); }
    }
    async function readNotification(request, response, next) {
        try {
            const notification = await NotificationModel.read(request.validated.params.notificationId, request.auth.user.id);
            if (!notification) throw notFound("Notification");
            return response.json({ success: true, data: { notification } });
        } catch (error) { return next(error); }
    }
    async function readAllNotifications(request, response, next) {
        try {
            await NotificationModel.readAll(request.auth.user.id);
            return response.status(HTTP_STATUS.NO_CONTENT).send();
        } catch (error) { return next(error); }
    }

    return Object.freeze({
        listComments, createComment, listChannels, createChannel,
        listMessages, createMessage, markChannelRead,
        listNotifications, readNotification, readAllNotifications,
    });
}

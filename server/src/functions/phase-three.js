import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import multer from "multer";
import { z } from "zod";
import { SOCKET_EVENTS } from "@teampulse/contracts/socket-events";
import { HTTP_STATUS } from "../core/http/http-status.js";
import { notFound, requireWorkspaceAccess } from "./access.js";

const id = z.string().regex(/^[a-f\d]{24}$/i);
export const workspaceQuerySchema = z.object({ body: z.object({}), params: z.object({ workspaceId: id }), query: z.object({ q: z.string().trim().min(1).max(100) }) });
export const calendarSchema = z.object({ body: z.object({}), params: z.object({ workspaceId: id }), query: z.object({ from: z.coerce.date(), to: z.coerce.date() }) });
export const workspaceOnlySchema = z.object({ body: z.object({}), params: z.object({ workspaceId: id }), query: z.object({}) });
export const createConversationSchema = z.object({ body: z.object({ workspaceId: id, participantId: id }), params: z.object({}), query: z.object({}) });
export const conversationSchema = z.object({ body: z.object({}), params: z.object({ conversationId: id }), query: z.object({}) });
export const directMessageSchema = z.object({ body: z.object({ content: z.string().trim().min(1).max(5000) }), params: z.object({ conversationId: id }), query: z.object({}) });
export const taskAttachmentSchema = z.object({ body: z.object({}), params: z.object({ taskId: id }), query: z.object({}) });

export function createPhaseThreeFunctions({ ConversationModel, DirectMessageModel, ActivityLogModel, AttachmentModel, TaskModel, ProjectModel, WorkspaceMemberModel, bus, uploadDir }) {
    const absoluteUploadDir = path.resolve(uploadDir);
    mkdirSync(absoluteUploadDir, { recursive: true });
    const upload = multer({
        storage: multer.diskStorage({
            destination: absoluteUploadDir,
            filename: (_request, file, callback) => callback(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname)}`),
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
    }).single("file");
    const access = (workspaceId, userId) => requireWorkspaceAccess({ WorkspaceMemberModel, workspaceId, userId });
    async function conversations(request, response, next) { try { return response.json({ success: true, data: { conversations: await ConversationModel.list(request.auth.user.id) } }); } catch (e) { return next(e); } }
    async function createConversation(request, response, next) { try {
        const { workspaceId, participantId } = request.validated.body; await access(workspaceId, request.auth.user.id); await access(workspaceId, participantId);
        return response.status(HTTP_STATUS.CREATED).json({ success: true, data: { conversation: await ConversationModel.findOrCreate(workspaceId, [request.auth.user.id, participantId]) } });
    } catch (e) { return next(e); } }
    async function messages(request, response, next) { try {
        const conversation = await ConversationModel.findById(request.validated.params.conversationId);
        if (!conversation || !conversation.participantIds.includes(request.auth.user.id)) throw notFound("Conversation");
        return response.json({ success: true, data: { messages: await DirectMessageModel.list(conversation.id) } });
    } catch (e) { return next(e); } }
    async function send(request, response, next) { try {
        const conversation = await ConversationModel.findById(request.validated.params.conversationId);
        if (!conversation || !conversation.participantIds.includes(request.auth.user.id)) throw notFound("Conversation");
        const message = await DirectMessageModel.create({ conversationId: conversation.id, authorId: request.auth.user.id, content: request.validated.body.content });
        await ConversationModel.touch(conversation.id);
        conversation.participantIds.forEach((userId) => bus.emitUser(userId, SOCKET_EVENTS.DIRECT_MESSAGE.CREATED, { message }));
        return response.status(HTTP_STATUS.CREATED).json({ success: true, data: { message } });
    } catch (e) { return next(e); } }
    async function search(request, response, next) { try { const { workspaceId } = request.validated.params; await access(workspaceId, request.auth.user.id); const q = request.validated.query.q; const [tasks, projects] = await Promise.all([TaskModel.search(workspaceId, q), ProjectModel.search(workspaceId, q)]); return response.json({ success: true, data: { tasks, projects } }); } catch (e) { return next(e); } }
    async function calendar(request, response, next) { try { const { workspaceId } = request.validated.params; await access(workspaceId, request.auth.user.id); return response.json({ success: true, data: { tasks: await TaskModel.calendar(workspaceId, request.validated.query.from, request.validated.query.to) } }); } catch (e) { return next(e); } }
    async function analytics(request, response, next) { try { const { workspaceId } = request.validated.params; await access(workspaceId, request.auth.user.id); return response.json({ success: true, data: await TaskModel.analytics(workspaceId) }); } catch (e) { return next(e); } }
    async function activity(request, response, next) { try { const { workspaceId } = request.validated.params; await access(workspaceId, request.auth.user.id); return response.json({ success: true, data: { activity: await ActivityLogModel.list(workspaceId) } }); } catch (e) { return next(e); } }
    async function attachments(request, response, next) { try { const task = await TaskModel.findById(request.validated.params.taskId); if (!task) throw notFound("Task"); await access(task.workspaceId, request.auth.user.id); return response.json({ success: true, data: { attachments: await AttachmentModel.list(task.id) } }); } catch (e) { return next(e); } }
    async function saveAttachment(request, response, next) { try { const task = await TaskModel.findById(request.params.taskId); if (!task) throw notFound("Task"); await access(task.workspaceId, request.auth.user.id); if (!request.file) throw new Error("File is required"); const attachment = await AttachmentModel.create({ workspaceId: task.workspaceId, taskId: task.id, uploadedBy: request.auth.user.id, originalName: request.file.originalname, storedName: request.file.filename, mimeType: request.file.mimetype, size: request.file.size }); return response.status(HTTP_STATUS.CREATED).json({ success: true, data: { attachment } }); } catch (e) { return next(e); } }
    return Object.freeze({ upload, conversations, createConversation, messages, send, search, calendar, analytics, activity, attachments, saveAttachment });
}

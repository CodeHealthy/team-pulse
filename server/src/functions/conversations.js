import { z } from "zod";

import { SOCKET_EVENTS } from "@teampulse/contracts/socket-events";

import { HTTP_STATUS } from "../core/http/http-status.js";
import {
    notFound,
    requireWorkspaceAccess,
} from "./access.js";

const id = z.string().regex(/^[a-f\d]{24}$/i);

export const createConversationSchema = z.object({
    body: z.object({
        workspaceId: id,
        participantId: id,
    }),
    params: z.object({}),
    query: z.object({}),
});

export const conversationSchema = z.object({
    body: z.object({}),
    params: z.object({
        conversationId: id,
    }),
    query: z.object({}),
});

export const directMessageSchema = z.object({
    body: z.object({
        content: z
            .string()
            .trim()
            .min(1)
            .max(5000),
    }),
    params: z.object({
        conversationId: id,
    }),
    query: z.object({}),
});

export function createConversationFunctions({
    ConversationRepository,
    DirectMessageRepository,
    WorkspaceMemberRepository,
    bus,
}) {
    async function list(
        request,
        response,
        next,
    ) {
        try {
            const conversations =
                await ConversationRepository.listByUserId(
                    request.auth.user.id,
                );

            return response.json({
                success: true,
                data: { conversations },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function create(
        request,
        response,
        next,
    ) {
        try {
            const { workspaceId, participantId } =
                request.validated.body;

            await Promise.all([
                requireWorkspaceAccess({
                    WorkspaceMemberRepository,
                    workspaceId,
                    userId: request.auth.user.id,
                }),
                requireWorkspaceAccess({
                    WorkspaceMemberRepository,
                    workspaceId,
                    userId: participantId,
                }),
            ]);

            const conversation =
                await ConversationRepository.findOrCreate(
                    workspaceId,
                    [
                        request.auth.user.id,
                        participantId,
                    ],
                );

            return response
                .status(HTTP_STATUS.CREATED)
                .json({
                    success: true,
                    data: { conversation },
                });
        } catch (error) {
            return next(error);
        }
    }

    async function requireParticipant(
        conversationId,
        userId,
    ) {
        const conversation =
            await ConversationRepository.findById(
                conversationId,
            );

        if (
            !conversation ||
            !conversation.participantIds.includes(
                userId,
            )
        ) {
            throw notFound("Conversation");
        }

        return conversation;
    }

    async function listMessages(
        request,
        response,
        next,
    ) {
        try {
            const conversation =
                await requireParticipant(
                    request.validated.params
                        .conversationId,
                    request.auth.user.id,
                );

            return response.json({
                success: true,
                data: {
                    messages:
                        await DirectMessageRepository.listByConversationId(
                            conversation.id,
                        ),
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    async function sendMessage(
        request,
        response,
        next,
    ) {
        try {
            const conversation =
                await requireParticipant(
                    request.validated.params
                        .conversationId,
                    request.auth.user.id,
                );
            const message =
                await DirectMessageRepository.create({
                    conversationId:
                        conversation.id,
                    authorId:
                        request.auth.user.id,
                    content:
                        request.validated.body
                            .content,
                });

            await ConversationRepository.touchById(
                conversation.id,
            );

            for (const userId of
                conversation.participantIds) {
                bus.emitUser(
                    userId,
                    SOCKET_EVENTS.DIRECT_MESSAGE
                        .CREATED,
                    { message },
                );
            }

            return response
                .status(HTTP_STATUS.CREATED)
                .json({
                    success: true,
                    data: { message },
                });
        } catch (error) {
            return next(error);
        }
    }

    return Object.freeze({
        list,
        create,
        listMessages,
        sendMessage,
    });
}

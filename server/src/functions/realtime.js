import { SOCKET_EVENTS } from "@teampulse/contracts/socket-events";

function readCookie(cookieHeader, name) {
    return cookieHeader
        ?.split(";")
        .map((item) => item.trim().split("="))
        .find(([key]) => key === name)?.[1];
}

export function createRealtimeFunctions({
    authFunctions,
    WorkspaceMemberModel,
    ChannelModel,
    bus,
}) {
    const presence = new Map();

    async function authenticate(socket, next) {
        try {
            const token = readCookie(
                socket.handshake.headers.cookie,
                "tp_access",
            );
            socket.data.user =
                await authFunctions.authenticateToken(token);
            next();
        } catch (error) {
            next(new Error(error.message));
        }
    }

    function publishPresence(workspaceId) {
        const workspacePresence =
            presence.get(workspaceId) ?? new Map();
        bus.emitWorkspace(
            workspaceId,
            SOCKET_EVENTS.WORKSPACE.PRESENCE,
            {
                userIds: [
                    ...workspacePresence.keys(),
                ],
            },
        );
    }

    function connect(io, socket) {
        socket.join(bus.userRoom(socket.data.user.id));

        function leaveWorkspace(workspaceId) {
            if (!socket.data.workspaceIds?.has(workspaceId)) return;
            socket.data.workspaceIds.delete(workspaceId);
            socket.leave(bus.workspaceRoom(workspaceId));
            const counts = presence.get(workspaceId);
            const remaining = (counts?.get(socket.data.user.id) ?? 1) - 1;
            if (remaining <= 0) counts?.delete(socket.data.user.id);
            else counts?.set(socket.data.user.id, remaining);
            publishPresence(workspaceId);
        }

        socket.on(
            SOCKET_EVENTS.WORKSPACE.JOIN,
            async ({ workspaceId } = {}, acknowledge) => {
                try {
                    const membership =
                        await WorkspaceMemberModel.find(
                            workspaceId,
                            socket.data.user.id,
                        );
                    if (!membership) {
                        throw new Error(
                            "Workspace access denied",
                        );
                    }

                    socket.data.workspaceIds ??= new Set();
                    if (socket.data.workspaceIds.has(workspaceId)) {
                        acknowledge?.({ success: true });
                        return;
                    }
                    socket.join(
                        bus.workspaceRoom(workspaceId),
                    );
                    socket.data.workspaceIds.add(workspaceId);

                    const counts =
                        presence.get(workspaceId) ??
                        new Map();
                    counts.set(
                        socket.data.user.id,
                        (counts.get(socket.data.user.id) ??
                            0) + 1,
                    );
                    presence.set(workspaceId, counts);
                    publishPresence(workspaceId);
                    acknowledge?.({ success: true });
                } catch (error) {
                    acknowledge?.({
                        success: false,
                        error: error.message,
                    });
                }
            },
        );

        socket.on(
            SOCKET_EVENTS.WORKSPACE.LEAVE,
            ({ workspaceId } = {}) => leaveWorkspace(workspaceId),
        );

        socket.on(
            SOCKET_EVENTS.CHANNEL.JOIN,
            async ({ channelId } = {}, acknowledge) => {
                try {
                    const channel =
                        await ChannelModel.findById(
                            channelId,
                        );
                    const membership =
                        channel &&
                        (await WorkspaceMemberModel.find(
                            channel.workspaceId,
                            socket.data.user.id,
                        ));
                    if (!membership) {
                        throw new Error(
                            "Channel access denied",
                        );
                    }
                    socket.join(
                        bus.channelRoom(channelId),
                    );
                    acknowledge?.({ success: true });
                } catch (error) {
                    acknowledge?.({
                        success: false,
                        error: error.message,
                    });
                }
            },
        );

        for (const [incoming, outgoing] of [
            [
                SOCKET_EVENTS.CHANNEL.TYPING_START,
                SOCKET_EVENTS.CHANNEL.TYPING_START,
            ],
            [
                SOCKET_EVENTS.CHANNEL.TYPING_STOP,
                SOCKET_EVENTS.CHANNEL.TYPING_STOP,
            ],
        ]) {
            socket.on(incoming, ({ channelId } = {}) => {
                if (
                    socket.rooms.has(
                        bus.channelRoom(channelId),
                    )
                ) {
                    socket
                        .to(bus.channelRoom(channelId))
                        .emit(outgoing, {
                            channelId,
                            user: socket.data.user,
                        });
                }
            });
        }

        socket.on(
            SOCKET_EVENTS.SYSTEM.DISCONNECT,
            () => {
                for (const workspaceId of
                    [...(socket.data.workspaceIds ?? [])])
                    leaveWorkspace(workspaceId);
            },
        );
    }

    return Object.freeze({
        authenticate,
        connect,
    });
}

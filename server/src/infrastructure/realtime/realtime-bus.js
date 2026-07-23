export function createRealtimeBus() {
    let io = null;
    const workspaceRoom = (id) => `workspace:${id}`;
    const channelRoom = (id) => `channel:${id}`;
    const userRoom = (id) => `user:${id}`;

    return Object.freeze({
        attach(socketServer) {
            io = socketServer;
        },
        workspaceRoom,
        channelRoom,
        userRoom,
        emitWorkspace(workspaceId, event, payload) {
            io?.to(workspaceRoom(workspaceId)).emit(event, payload);
        },
        emitChannel(channelId, event, payload) {
            io?.to(channelRoom(channelId)).emit(event, payload);
        },
        emitUser(userId, event, payload) {
            io?.to(userRoom(userId)).emit(event, payload);
        },
    });
}

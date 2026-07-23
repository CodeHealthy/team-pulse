export const SOCKET_EVENTS = Object.freeze({
    SYSTEM: Object.freeze({
        CONNECTION: "connection",
        DISCONNECT: "disconnect",
        CONNECT_ERROR: "connect_error",
    }),

    CONNECTION: Object.freeze({
        READY: "connection:ready",
    }),

    WORKSPACE: Object.freeze({
        JOIN: "workspace:join",
        LEAVE: "workspace:leave",
        PRESENCE: "workspace:presence",
    }),

    TASK: Object.freeze({
        CREATED: "task:created",
        UPDATED: "task:updated",
        DELETED: "task:deleted",
    }),

    COMMENT: Object.freeze({
        CREATED: "comment:created",
    }),

    CHANNEL: Object.freeze({
        JOIN: "channel:join",
        LEAVE: "channel:leave",
        TYPING_START: "channel:typing:start",
        TYPING_STOP: "channel:typing:stop",
    }),

    MESSAGE: Object.freeze({
        CREATED: "message:created",
    }),

    DIRECT_MESSAGE: Object.freeze({
        CREATED: "direct-message:created",
    }),

    NOTIFICATION: Object.freeze({
        CREATED: "notification:created",
    }),
});

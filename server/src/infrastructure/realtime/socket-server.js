import { SOCKET_EVENTS } from "@teampulse/contracts/socket-events";
import { Server } from "socket.io";

export function createSocketServer({
    httpServer,
    clientUrl,
    realtimeBus,
    realtimeFunctions,
    logger = console,
}) {
    const io = new Server(httpServer, {
        cors: {
            origin: clientUrl,
            credentials: true,
        },
    });

    realtimeBus.attach(io);
    io.use(realtimeFunctions.authenticate);

    io.on(
        SOCKET_EVENTS.SYSTEM.CONNECTION,
        (socket) => {
            logger.info(
                `Socket connected: ${socket.id}`,
            );

            socket.emit(
                SOCKET_EVENTS.CONNECTION.READY,
                {
                    socketId: socket.id,
                },
            );

            realtimeFunctions.connect(io, socket);

            socket.on(
                SOCKET_EVENTS.SYSTEM.DISCONNECT,
                (reason) => {
                    logger.info(
                        `Socket disconnected: ${socket.id}; reason: ${reason}`,
                    );
                },
            );
        },
    );

    return io;
}

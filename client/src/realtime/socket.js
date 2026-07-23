import { io } from "socket.io-client";

import { clientConfig } from "../config/client-config";

export const socket = io(
    clientConfig.socketUrl,
    {
        autoConnect: false,
        withCredentials: true,
    },
);
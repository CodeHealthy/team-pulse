import mongoose from "mongoose";

export function createMongooseDatabase({
    uri,
    serverSelectionTimeoutMs,
}) {
    async function connect() {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: serverSelectionTimeoutMs,
        });

        return mongoose.connection;
    }

    async function disconnect() {
        await mongoose.disconnect();
    }

    function getStatus() {
        const currentState = mongoose.connection.readyState;

        return mongoose.STATES[currentState] ?? "unknown";
    }

    function isConnected() {
        return (
            mongoose.connection.readyState ===
            mongoose.STATES.connected
        );
    }

    return Object.freeze({
        connect,
        disconnect,
        getStatus,
        isConnected,
    });
}
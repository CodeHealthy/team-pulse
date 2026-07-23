const rawConfig = {
    apiUrl: import.meta.env.VITE_API_URL,
    socketUrl:
        import.meta.env.VITE_SOCKET_URL,
};

const missingValues = Object.entries(rawConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

if (missingValues.length > 0) {
    throw new Error(
        `Missing client configuration: ${missingValues.join(", ")}`,
    );
}

export const clientConfig =
    Object.freeze(rawConfig);
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

export async function enableRedisScaling(io, redisUrl) {
    if (!redisUrl) return null;
    const publisher = createClient({ url: redisUrl });
    const subscriber = publisher.duplicate();
    await Promise.all([publisher.connect(), subscriber.connect()]);
    io.adapter(createAdapter(publisher, subscriber));
    return async () => Promise.all([publisher.quit(), subscriber.quit()]);
}

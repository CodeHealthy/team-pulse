import { Queue, Worker } from "bullmq";
import nodemailer from "nodemailer";

export function createJobService({ redisUrl, smtp, clientUrl }) {
    const transport = smtp.host
        ? nodemailer.createTransport({
              host: smtp.host, port: smtp.port,
              secure: smtp.port === 465,
              auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
          })
        : null;
    const sendInvitation = ({ email, token, workspaceName = "a TeamPulse workspace" }) => {
        if (!transport) return Promise.resolve();
        return transport.sendMail({
            from: smtp.from, to: email, subject: `Invitation to ${workspaceName}`,
            text: `Join your team: ${clientUrl}/invite/${token}`,
            html: `<p>You have been invited to ${workspaceName}.</p><p><a href="${clientUrl}/invite/${token}">Accept invitation</a></p>`,
        });
    };
    let queue = null;
    let worker = null;
    if (redisUrl) {
        const parsed = new URL(redisUrl);
        const connection = {
            host: parsed.hostname,
            port: Number(parsed.port || 6379),
            username:
                parsed.username || undefined,
            password:
                parsed.password || undefined,
            ...(parsed.protocol === "rediss:"
                ? { tls: {} }
                : {}),
        };
        queue = new Queue("teampulse", { connection });
        worker = new Worker("teampulse", async (job) => {
            if (job.name === "invitation-email") await sendInvitation(job.data);
        }, { connection });
    }
    return Object.freeze({
        enqueueInvitation(data) {
            return queue
                ? queue.add("invitation-email", data, { attempts: 3, backoff: { type: "exponential", delay: 1000 } })
                : sendInvitation(data);
        },
        async close() {
            await Promise.all([queue?.close(), worker?.close()].filter(Boolean));
        },
    });
}

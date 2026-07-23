import { APP_METADATA } from "@teampulse/contracts/app-metadata";
import { createServer } from "node:http";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createAuthFunctions } from "./functions/auth.js";
import { createBoardFunctions } from "./functions/boards.js";
import { createCollaborationFunctions } from "./functions/collaboration.js";
import { createHealthFunctions } from "./functions/health.js";
import { createInvitationFunctions } from "./functions/invitations.js";
import { createProjectFunctions } from "./functions/projects.js";
import { createPhaseThreeFunctions } from "./functions/phase-three.js";
import { createRealtimeFunctions } from "./functions/realtime.js";
import { createTaskFunctions } from "./functions/tasks.js";
import { createWorkspaceFunctions } from "./functions/workspaces.js";
import { createMongooseDatabase } from "./infrastructure/database/mongoose-database.js";
import { createJobService } from "./infrastructure/jobs/job-service.js";
import { createSocketServer } from "./infrastructure/realtime/socket-server.js";
import { createRealtimeBus } from "./infrastructure/realtime/realtime-bus.js";
import { enableRedisScaling } from "./infrastructure/realtime/redis-scaling.js";
import { ActivityLog } from "./models/activity-log.js";
import { Attachment } from "./models/attachment.js";
import { Board } from "./models/board.js";
import { BoardColumn } from "./models/board-column.js";
import { Channel } from "./models/channel.js";
import { ChannelRead } from "./models/channel-read.js";
import { Conversation } from "./models/conversation.js";
import { DirectMessage } from "./models/direct-message.js";
import { Invitation } from "./models/invitation.js";
import { Message } from "./models/message.js";
import { Notification } from "./models/notification.js";
import { Project } from "./models/project.js";
import { RefreshSession } from "./models/refresh-session.js";
import { Task } from "./models/task.js";
import { TaskComment } from "./models/task-comment.js";
import { User } from "./models/user.js";
import { Workspace } from "./models/workspace.js";
import { WorkspaceMember } from "./models/workspace-member.js";
import { createApiRouter } from "./routes/api-router.js";

const database = createMongooseDatabase(
    env.database,
);
const realtimeBus = createRealtimeBus();
const jobService = createJobService({
    redisUrl: env.services.redisUrl,
    smtp: env.services.smtp,
    clientUrl: env.app.clientUrl,
});

const authFunctions = createAuthFunctions({
    UserModel: User,
    RefreshSessionModel: RefreshSession,
    config: {
        ...env.auth,
        apiPrefix: env.app.apiPrefix,
        secureCookies:
            env.app.nodeEnv === "production",
    },
});

const healthFunctions =
    createHealthFunctions({
        appName: APP_METADATA.NAME,
        database,
    });

const workspaceFunctions =
    createWorkspaceFunctions({
        WorkspaceModel: Workspace,
        WorkspaceMemberModel: WorkspaceMember,
    });

const invitationFunctions =
    createInvitationFunctions({
        InvitationModel: Invitation,
        WorkspaceMemberModel: WorkspaceMember,
        jobService,
    });

const projectFunctions =
    createProjectFunctions({
        ProjectModel: Project,
        BoardModel: Board,
        BoardColumnModel: BoardColumn,
        WorkspaceMemberModel: WorkspaceMember,
    });

const boardFunctions = createBoardFunctions({
    ProjectModel: Project,
    BoardModel: Board,
    BoardColumnModel: BoardColumn,
    TaskModel: Task,
    WorkspaceMemberModel: WorkspaceMember,
});

const taskFunctions = createTaskFunctions({
    ActivityLogModel: ActivityLog,
    TaskModel: Task,
    BoardModel: Board,
    BoardColumnModel: BoardColumn,
    NotificationModel: Notification,
    WorkspaceMemberModel: WorkspaceMember,
    bus: realtimeBus,
});

const collaborationFunctions =
    createCollaborationFunctions({
        TaskModel: Task,
        TaskCommentModel: TaskComment,
        ChannelModel: Channel,
        MessageModel: Message,
        ChannelReadModel: ChannelRead,
        NotificationModel: Notification,
        WorkspaceMemberModel: WorkspaceMember,
        bus: realtimeBus,
    });

const phaseThreeFunctions =
    createPhaseThreeFunctions({
        ConversationModel: Conversation,
        DirectMessageModel: DirectMessage,
        ActivityLogModel: ActivityLog,
        AttachmentModel: Attachment,
        TaskModel: Task,
        ProjectModel: Project,
        WorkspaceMemberModel: WorkspaceMember,
        bus: realtimeBus,
        uploadDir: env.services.uploadDir,
    });

const apiRouter = createApiRouter({
    authFunctions,
    boardFunctions,
    collaborationFunctions,
    healthFunctions,
    invitationFunctions,
    phaseThreeFunctions,
    projectFunctions,
    taskFunctions,
    workspaceFunctions,
});

const app = createApp({
    config: {
        ...env.app,
        uploadDir: env.services.uploadDir,
    },
    apiRouter,
});

const httpServer = createServer(app);

const socketServer = createSocketServer({
    httpServer,
    clientUrl: env.app.clientUrl,
    realtimeBus,
    realtimeFunctions: createRealtimeFunctions({
        authFunctions,
        WorkspaceMemberModel: WorkspaceMember,
        ChannelModel: Channel,
        bus: realtimeBus,
    }),
});

let shuttingDown = false;
let closeRedisScaling = null;

function listen() {
    return new Promise((resolve, reject) => {
        function handleError(error) {
            httpServer.off(
                "listening",
                handleListening,
            );

            reject(error);
        }

        function handleListening() {
            httpServer.off("error", handleError);
            resolve();
        }

        httpServer.once("error", handleError);
        httpServer.once(
            "listening",
            handleListening,
        );

        httpServer.listen(env.app.port);
    });
}

function closeHttpServer() {
    return new Promise((resolve, reject) => {
        if (!httpServer.listening) {
            resolve();
            return;
        }

        httpServer.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

async function shutdown(signal) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;

    console.info(
        `${signal} received. Shutting down TeamPulse.`,
    );

    try {
        socketServer.disconnectSockets(true);

        await closeHttpServer();
        await database.disconnect();
        await closeRedisScaling?.();
        await jobService.close();

        console.info("Shutdown completed.");
        process.exit(0);
    } catch (error) {
        console.error(
            "Graceful shutdown failed:",
            error,
        );

        process.exit(1);
    }
}

async function bootstrap() {
    const connection = await database.connect();

    console.info(
        `MongoDB connected: ${connection.host}`,
    );

    closeRedisScaling =
        await enableRedisScaling(
            socketServer,
            env.services.redisUrl,
        );

    await listen();

    console.info(
        `${APP_METADATA.NAME} API running at http://localhost:${env.app.port}`,
    );
}

process.once("SIGINT", () => {
    void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
});

bootstrap().catch((error) => {
    console.error(
        "Server startup failed:",
        error,
    );

    process.exit(1);
});

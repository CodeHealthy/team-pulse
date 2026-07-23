import { APP_METADATA } from "@teampulse/contracts/app-metadata";
import { createServer } from "node:http";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createAuthFunctions } from "./functions/auth.js";
import { createAttachmentFunctions } from "./functions/attachments.js";
import { createBoardFunctions } from "./functions/boards.js";
import { createConversationFunctions } from "./functions/conversations.js";
import { createCollaborationFunctions } from "./functions/collaboration.js";
import { createHealthFunctions } from "./functions/health.js";
import { createInvitationFunctions } from "./functions/invitations.js";
import { createProjectFunctions } from "./functions/projects.js";
import { createRealtimeFunctions } from "./functions/realtime.js";
import { createSettingsFunctions } from "./functions/settings.js";
import { createTaskFunctions } from "./functions/tasks.js";
import { createWorkspaceFunctions } from "./functions/workspaces.js";
import { createActivityFunctions } from "./functions/workspace-activity.js";
import { createAnalyticsFunctions } from "./functions/workspace-analytics.js";
import { createCalendarFunctions } from "./functions/workspace-calendar.js";
import { createSearchFunctions } from "./functions/workspace-search.js";
import { createMongooseDatabase } from "./infrastructure/database/mongoose-database.js";
import { createJobService } from "./infrastructure/jobs/job-service.js";
import { createSocketServer } from "./infrastructure/realtime/socket-server.js";
import { createRealtimeBus } from "./infrastructure/realtime/realtime-bus.js";
import { enableRedisScaling } from "./infrastructure/realtime/redis-scaling.js";
import { activityLogRepository } from "./models/activity-log.model.js";
import { attachmentRepository } from "./models/attachment.model.js";
import { boardRepository } from "./models/board.model.js";
import { boardColumnRepository } from "./models/board-column.model.js";
import { channelRepository } from "./models/channel.model.js";
import { channelReadRepository } from "./models/channel-read.model.js";
import { conversationRepository } from "./models/conversation.model.js";
import { directMessageRepository } from "./models/direct-message.model.js";
import { invitationRepository } from "./models/invitation.model.js";
import { messageRepository } from "./models/message.model.js";
import { notificationRepository } from "./models/notification.model.js";
import { projectRepository } from "./models/project.model.js";
import { refreshSessionRepository } from "./models/refresh-session.model.js";
import { taskRepository } from "./models/task.model.js";
import { taskCommentRepository } from "./models/task-comment.model.js";
import { userRepository } from "./models/user.model.js";
import { workspaceRepository } from "./models/workspace.model.js";
import { workspaceMemberRepository } from "./models/workspace-member.model.js";
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
    UserRepository: userRepository,
    RefreshSessionRepository:
        refreshSessionRepository,
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

const settingsFunctions =
    createSettingsFunctions({
        UserRepository: userRepository,
    });

const workspaceFunctions =
    createWorkspaceFunctions({
        WorkspaceRepository: workspaceRepository,
        WorkspaceMemberRepository:
            workspaceMemberRepository,
    });

const invitationFunctions =
    createInvitationFunctions({
        InvitationRepository: invitationRepository,
        WorkspaceMemberRepository:
            workspaceMemberRepository,
        jobService,
    });

const projectFunctions =
    createProjectFunctions({
        ProjectRepository: projectRepository,
        BoardRepository: boardRepository,
        BoardColumnRepository:
            boardColumnRepository,
        WorkspaceMemberRepository:
            workspaceMemberRepository,
    });

const boardFunctions = createBoardFunctions({
    ProjectRepository: projectRepository,
    BoardRepository: boardRepository,
    BoardColumnRepository: boardColumnRepository,
    TaskRepository: taskRepository,
    WorkspaceMemberRepository:
        workspaceMemberRepository,
});

const taskFunctions = createTaskFunctions({
    ActivityLogRepository: activityLogRepository,
    TaskRepository: taskRepository,
    BoardRepository: boardRepository,
    BoardColumnRepository: boardColumnRepository,
    NotificationRepository: notificationRepository,
    WorkspaceMemberRepository:
        workspaceMemberRepository,
    bus: realtimeBus,
});

const collaborationFunctions =
    createCollaborationFunctions({
        TaskRepository: taskRepository,
        TaskCommentRepository:
            taskCommentRepository,
        ChannelRepository: channelRepository,
        MessageRepository: messageRepository,
        ChannelReadRepository:
            channelReadRepository,
        NotificationRepository:
            notificationRepository,
        WorkspaceMemberRepository:
            workspaceMemberRepository,
        bus: realtimeBus,
    });

const conversationFunctions =
    createConversationFunctions({
        ConversationRepository:
            conversationRepository,
        DirectMessageRepository:
            directMessageRepository,
        WorkspaceMemberRepository:
            workspaceMemberRepository,
        bus: realtimeBus,
    });

const attachmentFunctions =
    createAttachmentFunctions({
        AttachmentRepository: attachmentRepository,
        TaskRepository: taskRepository,
        WorkspaceMemberRepository:
            workspaceMemberRepository,
        uploadDir: env.services.uploadDir,
    });

const searchFunctions = createSearchFunctions({
    TaskRepository: taskRepository,
    ProjectRepository: projectRepository,
    WorkspaceMemberRepository:
        workspaceMemberRepository,
});

const calendarFunctions =
    createCalendarFunctions({
        TaskRepository: taskRepository,
        WorkspaceMemberRepository:
            workspaceMemberRepository,
    });

const analyticsFunctions =
    createAnalyticsFunctions({
        TaskRepository: taskRepository,
        WorkspaceMemberRepository:
            workspaceMemberRepository,
    });

const activityFunctions =
    createActivityFunctions({
        ActivityLogRepository: activityLogRepository,
        WorkspaceMemberRepository:
            workspaceMemberRepository,
    });

const apiRouter = createApiRouter({
    activityFunctions,
    analyticsFunctions,
    authFunctions,
    attachmentFunctions,
    boardFunctions,
    calendarFunctions,
    collaborationFunctions,
    conversationFunctions,
    healthFunctions,
    invitationFunctions,
    projectFunctions,
    searchFunctions,
    settingsFunctions,
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
        WorkspaceMemberRepository:
            workspaceMemberRepository,
        ChannelRepository: channelRepository,
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

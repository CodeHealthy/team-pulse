function pass(_request, _response, next) {
    next();
}

function respond(_request, response) {
    response.status(204).send();
}

export function createRouteFunctionStubs(
    overrides = {},
) {
    return {
        authFunctions: {
            register: respond,
            login: respond,
            refresh: respond,
            requireAuth: pass,
            currentUser: respond,
            logout: respond,
        },
        workspaceFunctions: {
            list: respond,
            create: respond,
            get: respond,
            update: respond,
            listMembers: respond,
            updateMemberRole: respond,
        },
        invitationFunctions: {
            list: respond,
            create: respond,
            accept: respond,
        },
        projectFunctions: {
            list: respond,
            create: respond,
            get: respond,
            update: respond,
        },
        boardFunctions: {
            get: respond,
            createColumn: respond,
            updateColumn: respond,
            removeColumn: respond,
        },
        taskFunctions: {
            create: respond,
            update: respond,
            remove: respond,
        },
        collaborationFunctions: {
            listComments: respond,
            createComment: respond,
            listChannels: respond,
            createChannel: respond,
            listMessages: respond,
            createMessage: respond,
            markChannelRead: respond,
            listNotifications: respond,
            readNotification: respond,
            readAllNotifications: respond,
        },
        conversationFunctions: {
            list: respond,
            create: respond,
            listMessages: respond,
            sendMessage: respond,
        },
        attachmentFunctions: {
            list: respond,
            authorizeUpload: pass,
            upload: pass,
            create: respond,
        },
        searchFunctions: {
            searchWorkspace: respond,
        },
        calendarFunctions: {
            getWorkspaceCalendar: respond,
        },
        analyticsFunctions: {
            getWorkspaceAnalytics: respond,
        },
        activityFunctions: {
            listWorkspaceActivity: respond,
        },
        healthFunctions: {
            checkHealth: respond,
        },
        ...overrides,
    };
}

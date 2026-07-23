import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { collaborationApi } from "./collaboration-api";

const fail = (error) => error?.message ?? "Collaboration request failed";
const thunk = (type, work) =>
  createAsyncThunk(type, async (value, { rejectWithValue }) => {
    try { return await work(value); } catch (error) { return rejectWithValue(fail(error)); }
  });

export const loadChannels = thunk("collaboration/channels", collaborationApi.channels);
export const addChannel = thunk("collaboration/addChannel", ({ workspaceId, name }) => collaborationApi.createChannel(workspaceId, name));
export const loadMessages = thunk("collaboration/messages", async (channelId) => ({
  channelId, messages: await collaborationApi.messages(channelId),
}));
export const sendMessage = thunk("collaboration/send", ({ channelId, content }) => collaborationApi.sendMessage(channelId, content));
export const loadComments = thunk("collaboration/comments", async (taskId) => ({
  taskId, comments: await collaborationApi.comments(taskId),
}));
export const addComment = thunk("collaboration/comment", ({ taskId, content }) => collaborationApi.comment(taskId, content));
export const loadNotifications = thunk("collaboration/notifications", collaborationApi.notifications);
export const readAllNotifications = thunk("collaboration/readAll", collaborationApi.readAll);

const slice = createSlice({
  name: "collaboration",
  initialState: {
    channels: [], selectedChannelId: null, messages: [],
    commentsByTask: {}, notifications: [], onlineUserIds: [],
    typingUsers: {}, error: null,
  },
  reducers: {
    messageReceived(state, action) {
      const message = action.payload;
      if (message.channelId === state.selectedChannelId && !state.messages.some((item) => item.id === message.id)) {
        state.messages.push(message);
      } else {
        const channel = state.channels.find((item) => item.id === message.channelId);
        if (channel) channel.unreadCount += 1;
      }
    },
    commentReceived(state, action) {
      const comment = action.payload;
      const comments = state.commentsByTask[comment.taskId];
      if (comments && !comments.some((item) => item.id === comment.id)) comments.push(comment);
    },
    notificationReceived(state, action) { state.notifications.unshift(action.payload); },
    presenceReceived(state, action) { state.onlineUserIds = action.payload; },
    typingChanged(state, action) {
      const { channelId, user, typing } = action.payload;
      state.typingUsers[channelId] ??= {};
      if (typing) state.typingUsers[channelId][user.id] = user;
      else delete state.typingUsers[channelId][user.id];
    },
    clearCollaboration(state) {
      state.channels = []; state.messages = []; state.selectedChannelId = null;
      state.onlineUserIds = []; state.typingUsers = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadChannels.fulfilled, (state, action) => { state.channels = action.payload; })
      .addCase(addChannel.fulfilled, (state, action) => { state.channels.push(action.payload); })
      .addCase(loadMessages.fulfilled, (state, action) => {
        state.selectedChannelId = action.payload.channelId;
        state.messages = action.payload.messages;
        const channel = state.channels.find((item) => item.id === action.payload.channelId);
        if (channel) channel.unreadCount = 0;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        if (!state.messages.some((item) => item.id === action.payload.id)) state.messages.push(action.payload);
      })
      .addCase(loadComments.fulfilled, (state, action) => { state.commentsByTask[action.payload.taskId] = action.payload.comments; })
      .addCase(addComment.fulfilled, (state, action) => {
        const comments = state.commentsByTask[action.payload.taskId] ??= [];
        if (!comments.some((item) => item.id === action.payload.id)) comments.push(action.payload);
      })
      .addCase(loadNotifications.fulfilled, (state, action) => { state.notifications = action.payload; })
      .addCase(readAllNotifications.fulfilled, (state) => {
        const now = new Date().toISOString();
        state.notifications.forEach((item) => { item.readAt ??= now; });
      });
  },
});

export const {
  messageReceived, commentReceived, notificationReceived,
  presenceReceived, typingChanged, clearCollaboration,
} = slice.actions;
export default slice.reducer;

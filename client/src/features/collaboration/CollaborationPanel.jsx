import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SOCKET_EVENTS } from "@teampulse/contracts/socket-events";
import { socket } from "../../realtime/socket";
import {
  addChannel, loadMessages, readAllNotifications, sendMessage,
} from "./collaboration-slice";

export default function CollaborationPanel({ mode, workspaceId, onClose }) {
  const dispatch = useDispatch();
  const collaboration = useSelector((state) => state.collaboration);
  const currentUser = useSelector((state) => state.auth.user);
  const [text, setText] = useState("");
  const [channelName, setChannelName] = useState("");
  const typing = Object.values(collaboration.typingUsers[collaboration.selectedChannelId] ?? {});

  async function selectChannel(channelId) {
    await dispatch(loadMessages(channelId));
    socket.emit(SOCKET_EVENTS.CHANNEL.JOIN, { channelId });
  }

  if (mode === "notifications") {
    return (
      <aside className="collaboration-panel">
        <PanelHeader title="Notifications" onClose={onClose} />
        <button className="panel-text-button" type="button" onClick={() => dispatch(readAllNotifications())}>
          Mark all as read
        </button>
        <div className="notification-list">
          {collaboration.notifications.map((item) => (
            <article className={item.readAt ? "" : "unread"} key={item.id}>
              <strong>{item.title}</strong><p>{item.body}</p>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </article>
          ))}
          {!collaboration.notifications.length && <p className="panel-empty">No notifications yet.</p>}
        </div>
      </aside>
    );
  }

  const selected = collaboration.channels.find((item) => item.id === collaboration.selectedChannelId);
  return (
    <aside className="collaboration-panel chat-panel">
      <PanelHeader title="Team channels" onClose={onClose} />
      <div className="channel-tabs">
        {collaboration.channels.map((channel) => (
          <button key={channel.id} className={channel.id === selected?.id ? "active" : ""} type="button" onClick={() => selectChannel(channel.id)}>
            # {channel.name}{channel.unreadCount > 0 && <span>{channel.unreadCount}</span>}
          </button>
        ))}
      </div>
      {!collaboration.channels.length && (
        <form className="create-channel" onSubmit={async (event) => {
          event.preventDefault();
          const result = await dispatch(addChannel({ workspaceId, name: channelName || "general" }));
          if (!result.error) { setChannelName(""); void selectChannel(result.payload.id); }
        }}>
          <p>Create the first workspace channel.</p>
          <input value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="general" />
          <button className="primary-button" type="submit">Create channel</button>
        </form>
      )}
      {selected && (
        <>
          <div className="message-list">
            {collaboration.messages.map((message) => (
              <article className={message.authorId === currentUser.id ? "own" : ""} key={message.id}>
                <strong>{message.author?.name ?? "Team member"}</strong>
                <p>{message.content}</p>
                <small>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
              </article>
            ))}
          </div>
          <p className="typing-line">
            {typing.length ? `${typing.map((user) => user.name).join(", ")} typing...` : ""}
          </p>
          <form className="message-form" onSubmit={async (event) => {
            event.preventDefault();
            if (!text.trim()) return;
            await dispatch(sendMessage({ channelId: selected.id, content: text }));
            setText("");
            socket.emit(SOCKET_EVENTS.CHANNEL.TYPING_STOP, { channelId: selected.id });
          }}>
            <input value={text} onChange={(event) => {
              setText(event.target.value);
              socket.emit(event.target.value ? SOCKET_EVENTS.CHANNEL.TYPING_START : SOCKET_EVENTS.CHANNEL.TYPING_STOP, { channelId: selected.id });
            }} placeholder={`Message #${selected.name}`} />
            <button className="primary-button" type="submit">Send</button>
          </form>
        </>
      )}
    </aside>
  );
}

function PanelHeader({ title, onClose }) {
  return <header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close">×</button></header>;
}

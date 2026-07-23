import { useEffect, useState } from "react";
import { SOCKET_EVENTS } from "@teampulse/contracts/socket-events";
import { apiRequest } from "../auth/auth-api";
import { socket } from "../../realtime/socket";
import {
  formatDate,
  formatDateTime,
} from "../../shared/utils/date-format";

export default function WorkspaceToolsPanel({
  workspaceId,
  members,
  datePreferences,
  onClose,
}) {
  const [tab, setTab] = useState("analytics");
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState(null);
  const [directText, setDirectText] = useState("");

  useEffect(() => {
    if (tab === "direct") {
      void apiRequest("/conversations").then((response) => setData(response.data));
    } else if (tab === "analytics" || tab === "activity" || tab === "calendar") {
      const suffix = tab === "calendar"
        ? `/calendar?from=${encodeURIComponent(new Date().toISOString())}&to=${encodeURIComponent(new Date(Date.now() + 90 * 86400000).toISOString())}`
        : `/${tab}`;
      void apiRequest(`/workspaces/${workspaceId}${suffix}`).then((response) => setData(response.data));
    }
  }, [tab, workspaceId]);

  useEffect(() => {
    function receive({ message }) {
      if (
        message.conversationId ===
          conversation?.id &&
        !conversation.messages.some(
          (item) => item.id === message.id,
        )
      ) {
        setConversation({
          ...conversation,
          messages: [
            ...conversation.messages,
            message,
          ],
        });
      }
    }
    socket.on(
      SOCKET_EVENTS.DIRECT_MESSAGE.CREATED,
      receive,
    );
    return () =>
      socket.off(
        SOCKET_EVENTS.DIRECT_MESSAGE.CREATED,
        receive,
      );
  }, [conversation]);

  async function search(event) {
    event.preventDefault();
    const response = await apiRequest(`/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`);
    setData(response.data);
  }

  return (
    <aside className="collaboration-panel insights-panel">
      <header><h2>Workspace tools</h2><button type="button" onClick={onClose}>×</button></header>
      <div className="channel-tabs">
        {["analytics", "search", "calendar", "activity", "direct"].map((item) => (
          <button className={tab === item ? "active" : ""} key={item} type="button" onClick={() => { setTab(item); setData(null); }}>
            {item}
          </button>
        ))}
      </div>
      {tab === "search" && (
        <form className="message-form" onSubmit={search}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks and projects" />
          <button className="primary-button" type="submit">Search</button>
        </form>
      )}
      {tab === "analytics" && data && (
        <div className="analytics-grid">
          <article><strong>{data.totalTasks}</strong><span>Total tasks</span></article>
          <article><strong>{data.overdueTasks}</strong><span>Overdue</span></article>
          {Object.entries(data.byPriority ?? {}).map(([name, count]) => <article key={name}><strong>{count}</strong><span>{name}</span></article>)}
        </div>
      )}
      {tab === "search" && data && (
        <div className="tool-list">
          {[...(data.projects ?? []).map((item) => ({ ...item, kind: "Project" })), ...(data.tasks ?? []).map((item) => ({ ...item, kind: "Task" }))].map((item) => (
            <article key={`${item.kind}-${item.id}`}><small>{item.kind}</small><strong>{item.name ?? item.title}</strong></article>
          ))}
        </div>
      )}
      {tab === "calendar" && <div className="tool-list">{(data?.tasks ?? []).map((task) => <article key={task.id}><small>{formatDate(task.dueDate, datePreferences)}</small><strong>{task.title}</strong></article>)}</div>}
      {tab === "activity" && <div className="tool-list">{(data?.activity ?? []).map((item) => <article key={item.id}><small>{formatDateTime(item.createdAt, datePreferences)}</small><strong>{item.actor?.name ?? "Member"} · {item.action}</strong></article>)}</div>}
      {tab === "direct" && (
        <div className="direct-tools">
          <select defaultValue="" onChange={async (event) => {
            if (!event.target.value) return;
            const response = await apiRequest("/conversations", { method: "POST", body: JSON.stringify({ workspaceId, participantId: event.target.value }) });
            const selected = response.data.conversation;
            const messages = await apiRequest(`/conversations/${selected.id}/messages`);
            setConversation({ ...selected, messages: messages.data.messages });
          }}>
            <option value="">Start direct message</option>
            {members.map((member) => <option key={member.userId} value={member.userId}>{member.user?.name ?? member.userId}</option>)}
          </select>
          <div className="tool-list">
            {(conversation?.messages ?? []).map((message) => <article key={message.id}><small>{message.author?.name}</small><strong>{message.content}</strong></article>)}
          </div>
          {conversation && <form className="message-form" onSubmit={async (event) => {
            event.preventDefault(); if (!directText.trim()) return;
            const response = await apiRequest(`/conversations/${conversation.id}/messages`, { method: "POST", body: JSON.stringify({ content: directText }) });
            setConversation({ ...conversation, messages: [...conversation.messages, response.data.message] }); setDirectText("");
          }}><input value={directText} onChange={(event) => setDirectText(event.target.value)} placeholder="Direct message" /><button className="primary-button">Send</button></form>}
        </div>
      )}
    </aside>
  );
}

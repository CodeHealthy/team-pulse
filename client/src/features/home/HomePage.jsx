import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { SOCKET_EVENTS } from "@teampulse/contracts/socket-events";
import {
  useDispatch,
  useSelector,
} from "react-redux";

import { logoutUser } from "../auth/auth-slice";
import CollaborationPanel from "../collaboration/CollaborationPanel";
import WorkspaceToolsPanel from "../insights/WorkspaceToolsPanel";
import { apiRequest } from "../auth/auth-api";
import {
  addComment,
  commentReceived,
  loadChannels,
  loadComments,
  loadNotifications,
  messageReceived,
  notificationReceived,
  presenceReceived,
  typingChanged,
} from "../collaboration/collaboration-slice";
import {
  createColumn,
  createProject,
  createTask,
  createWorkspace,
  clearWorkspaceError,
  clearInvitationToken,
  deleteTask,
  inviteMember,
  loadWorkspaces,
  openProject,
  openWorkspace,
  updateTask,
  realtimeTaskCreated,
  realtimeTaskDeleted,
  realtimeTaskUpdated,
} from "../workspaces/workspace-slice";
import { socket } from "../../realtime/socket";
import Board from "../board/components/Board";
import ProjectHeader from "../board/components/ProjectHeader";
import Sidebar from "./components/Sidebar";

const EMPTY_TASK = {
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
  assigneeIds: [],
  labels: "",
};

export default function HomePage() {
  const dispatch = useDispatch();
  const loaded = useRef(false);
  const user = useSelector(
    (state) => state.auth.user,
  );
  const workspace = useSelector(
    (state) => state.workspace,
  );
  const [modal, setModal] = useState(null);
  const [taskForm, setTaskForm] =
    useState(EMPTY_TASK);
  const [activeColumnId, setActiveColumnId] =
    useState(null);
  const [editingTaskId, setEditingTaskId] =
    useState(null);
  const [sidePanel, setSidePanel] = useState(null);
  const [boardQuery, setBoardQuery] = useState("");
  const [boardPriority, setBoardPriority] =
    useState("all");
  const collaboration = useSelector(
    (state) => state.collaboration,
  );

  const selectedWorkspace =
    workspace.workspaces.find(
      (item) =>
        item.id ===
        workspace.selectedWorkspaceId,
    );
  const selectedProject =
    workspace.projects.find(
      (item) =>
        item.id ===
        workspace.selectedProjectId,
    );

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    void dispatch(loadWorkspaces()).then(
      (result) => {
        const first = result.payload?.[0];
        if (first) {
          void dispatch(
            openWorkspace(first.id),
          );
        }
      },
    );
  }, [dispatch]);

  useEffect(() => {
    const handlers = {
      [SOCKET_EVENTS.TASK.CREATED]: ({ task }) => dispatch(realtimeTaskCreated(task)),
      [SOCKET_EVENTS.TASK.UPDATED]: ({ task }) => dispatch(realtimeTaskUpdated(task)),
      [SOCKET_EVENTS.TASK.DELETED]: ({ taskId }) => dispatch(realtimeTaskDeleted(taskId)),
      [SOCKET_EVENTS.COMMENT.CREATED]: ({ comment }) => dispatch(commentReceived(comment)),
      [SOCKET_EVENTS.MESSAGE.CREATED]: ({ message }) => dispatch(messageReceived(message)),
      [SOCKET_EVENTS.NOTIFICATION.CREATED]: ({ notification }) => dispatch(notificationReceived(notification)),
      [SOCKET_EVENTS.WORKSPACE.PRESENCE]: ({ userIds }) => dispatch(presenceReceived(userIds)),
      [SOCKET_EVENTS.CHANNEL.TYPING_START]: ({ channelId, user }) => dispatch(typingChanged({ channelId, user, typing: true })),
      [SOCKET_EVENTS.CHANNEL.TYPING_STOP]: ({ channelId, user }) => dispatch(typingChanged({ channelId, user, typing: false })),
    };
    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    socket.connect();
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
      socket.disconnect();
    };
  }, [dispatch]);

  useEffect(() => {
    if (!workspace.selectedWorkspaceId) return;
    const workspaceId =
      workspace.selectedWorkspaceId;
    socket.emit(SOCKET_EVENTS.WORKSPACE.JOIN, {
      workspaceId,
    });
    void dispatch(loadChannels(workspaceId));
    void dispatch(loadNotifications());
    return () => {
      socket.emit(
        SOCKET_EVENTS.WORKSPACE.LEAVE,
        { workspaceId },
      );
    };
  }, [dispatch, workspace.selectedWorkspaceId]);

  const closeModal = useCallback(() => {
    if (modal === "invite") {
      dispatch(clearInvitationToken());
    }
    setModal(null);
    setEditingTaskId(null);
    setTaskForm(EMPTY_TASK);
    dispatch(clearWorkspaceError());
  }, [dispatch, modal]);

  function openNewTask(columnId) {
    setActiveColumnId(columnId);
    setTaskForm(EMPTY_TASK);
    setModal("task");
  }

  function openTask(task) {
    setEditingTaskId(task.id);
    setActiveColumnId(task.columnId);
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate
        ? task.dueDate.slice(0, 10)
        : "",
      assigneeIds: task.assigneeIds,
      labels: task.labels.join(", "),
    });
    setModal("task");
    void dispatch(loadComments(task.id));
  }

  async function submitTask(event) {
    event.preventDefault();
    const payload = {
      title: taskForm.title,
      description: taskForm.description,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate
        ? new Date(
            `${taskForm.dueDate}T00:00:00.000Z`,
          ).toISOString()
        : null,
      assigneeIds: taskForm.assigneeIds,
      labels: taskForm.labels
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean),
    };

    const action = editingTaskId
      ? updateTask({
          taskId: editingTaskId,
          changes: payload,
        })
      : createTask({
          boardId: workspace.board.id,
          task: {
            ...payload,
            columnId: activeColumnId,
          },
        });

    const result = await dispatch(action);
    if (!result.error) closeModal();
  }

  function handleDrop(event, columnId) {
    event.preventDefault();
    const taskId =
      event.dataTransfer.getData("text/task-id");
    const task = workspace.tasks.find(
      (item) => item.id === taskId,
    );

    if (task && task.columnId !== columnId) {
      void dispatch(
        updateTask({
          taskId,
          changes: {
            columnId,
            position: workspace.tasks.filter(
              (item) =>
                item.columnId === columnId,
            ).length,
          },
        }),
      );
    }
  }

  return (
    <div className="product-shell">
      <Sidebar
        user={user}
        workspaces={workspace.workspaces}
        projects={workspace.projects}
        selectedWorkspaceId={
          workspace.selectedWorkspaceId
        }
        selectedProjectId={
          workspace.selectedProjectId
        }
        onCreateWorkspace={() =>
          setModal("workspace")
        }
        onCreateProject={() => setModal("project")}
        onOpenWorkspace={(workspaceId) =>
          dispatch(openWorkspace(workspaceId))
        }
        onOpenProject={(projectId) =>
          dispatch(openProject(projectId))
        }
        onSignOut={() => dispatch(logoutUser())}
      />

      <main className="product-main">
        {!selectedWorkspace ? (
          <EmptyWorkspace
            loading={workspace.status === "loading"}
            onCreate={() =>
              setModal("workspace")
            }
          />
        ) : (
          <>
            <ProjectHeader
              workspace={selectedWorkspace}
              project={selectedProject}
              members={workspace.members}
              onlineUserIds={
                collaboration.onlineUserIds
              }
              unreadMessages={collaboration.channels.reduce(
                (sum, channel) =>
                  sum + channel.unreadCount,
                0,
              )}
              unreadNotifications={collaboration.notifications.filter(
                (item) => !item.readAt,
              ).length}
              query={boardQuery}
              priority={boardPriority}
              onQueryChange={setBoardQuery}
              onPriorityChange={setBoardPriority}
              onInvite={() => setModal("invite")}
              onOpenChat={() => setSidePanel("chat")}
              onOpenNotifications={() =>
                setSidePanel("notifications")
              }
              onOpenTools={() =>
                setSidePanel("insights")
              }
              onNewColumn={() => setModal("column")}
            />

            {workspace.error && (
              <p className="form-error workspace-error">
                {workspace.error}
              </p>
            )}

            {!selectedProject ? (
              <EmptyProject
                projects={workspace.projects}
                onCreate={() =>
                  setModal("project")
                }
              />
            ) : (
              <Board
                columns={workspace.columns}
                tasks={workspace.tasks}
                members={workspace.members}
                query={boardQuery}
                priority={boardPriority}
                onNewTask={openNewTask}
                onOpenTask={openTask}
                onDrop={handleDrop}
              />
            )}
          </>
        )}
      </main>

      {modal && (
        <Modal
          title={{
            workspace: "Create workspace",
            project: "Create project",
            task: editingTaskId
              ? "Task details"
              : "Create task",
            invite: "Invite a teammate",
            column: "Add board column",
          }[modal]}
          onClose={closeModal}
          error={workspace.error}
        >
          {modal === "workspace" && (
            <SimpleNameForm
              label="Workspace name"
              button="Create workspace"
              onSubmit={async (name) => {
                const result = await dispatch(
                  createWorkspace(name),
                );
                if (!result.error) {
                  await dispatch(
                    openWorkspace(
                      result.payload.id,
                    ),
                  );
                  closeModal();
                }
              }}
            />
          )}
          {modal === "project" && (
            <ProjectForm
              onSubmit={async (project) => {
                const result = await dispatch(
                  createProject({
                    workspaceId:
                      workspace.selectedWorkspaceId,
                    project,
                  }),
                );
                if (!result.error) closeModal();
              }}
            />
          )}
          {modal === "column" && (
            <SimpleNameForm
              label="Column name"
              button="Add column"
              onSubmit={async (name) => {
                const result = await dispatch(
                  createColumn({
                    boardId: workspace.board.id,
                    name,
                  }),
                );
                if (!result.error) closeModal();
              }}
            />
          )}
          {modal === "invite" && (
            <InviteForm
              token={workspace.invitationToken}
              onSubmit={(invitation) =>
                dispatch(
                  inviteMember({
                    workspaceId:
                      workspace.selectedWorkspaceId,
                    invitation,
                  }),
                )
              }
            />
          )}
          {modal === "task" && (
            <TaskForm
              form={taskForm}
              setForm={setTaskForm}
              members={workspace.members}
              editing={Boolean(editingTaskId)}
              onSubmit={submitTask}
              onDelete={
                editingTaskId
                  ? async () => {
                      await dispatch(
                        deleteTask(editingTaskId),
                      );
                      closeModal();
                    }
                  : null
              }
              comments={
                collaboration.commentsByTask[
                  editingTaskId
                ] ?? []
              }
              onComment={(content) =>
                dispatch(
                  addComment({
                    taskId: editingTaskId,
                    content,
                  }),
                )
              }
              taskId={editingTaskId}
            />
          )}
        </Modal>
      )}
      {sidePanel && (
        sidePanel === "insights" ? (
          <WorkspaceToolsPanel workspaceId={workspace.selectedWorkspaceId} members={workspace.members} onClose={() => setSidePanel(null)} />
        ) : (
          <CollaborationPanel mode={sidePanel} workspaceId={workspace.selectedWorkspaceId} onClose={() => setSidePanel(null)} />
        )
      )}
    </div>
  );
}

function EmptyWorkspace({ loading, onCreate }) {
  return (
    <section className="product-empty">
      <span className="empty-mark">TP</span>
      <p className="eyebrow">Start here</p>
      <h1>Create your first workspace</h1>
      <p>
        A workspace brings your team, projects, and
        tasks together.
      </p>
      <button
        className="primary-button"
        type="button"
        disabled={loading}
        onClick={onCreate}
      >
        Create workspace
      </button>
    </section>
  );
}

function EmptyProject({ projects, onCreate }) {
  return (
    <section className="product-empty compact">
      <p className="eyebrow">
        {projects.length
          ? "Choose a project"
          : "Next step"}
      </p>
      <h2>
        {projects.length
          ? "Select a project from the sidebar"
          : "Create your first project"}
      </h2>
      <p>
        Projects include a ready-to-use task board with
        four workflow columns.
      </p>
      <button
        className="primary-button"
        type="button"
        onClick={onCreate}
      >
        New project
      </button>
    </section>
  );
}

function Modal({
  title,
  onClose,
  error,
  children,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const firstFocusable =
      dialog?.querySelector(focusableSelector);

    (firstFocusable ?? dialog)?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();

      if (
        event.key !== "Tab" ||
        !dialogRef.current
      ) {
        return;
      }

      const focusable = [
        ...dialogRef.current.querySelectorAll(
          focusableSelector,
        ),
      ];
      const first = focusable[0];
      const last = focusable.at(-1);

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header>
          <h2>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        {error && (
          <p
            className="form-error modal-error"
            role="alert"
          >
            {error}
          </p>
        )}
        {children}
      </section>
    </div>
  );
}

function SimpleNameForm({
  label,
  button,
  onSubmit,
}) {
  const [name, setName] = useState("");
  return (
    <form
      className="product-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(name);
      }}
    >
      <label>
        {label}
        <input
          autoFocus
          value={name}
          minLength={2}
          maxLength={80}
          onChange={(event) =>
            setName(event.target.value)
          }
          required
        />
      </label>
      <button
        className="primary-button"
        type="submit"
      >
        {button}
      </button>
    </form>
  );
}

function ProjectForm({ onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#4F7CFF",
  });
  return (
    <form
      className="product-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(form);
      }}
    >
      <label>
        Project name
        <input
          autoFocus
          value={form.name}
          onChange={(event) =>
            setForm({
              ...form,
              name: event.target.value,
            })
          }
          required
        />
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(event) =>
            setForm({
              ...form,
              description: event.target.value,
            })
          }
        />
      </label>
      <label>
        Project color
        <input
          type="color"
          value={form.color}
          onChange={(event) =>
            setForm({
              ...form,
              color: event.target.value,
            })
          }
        />
      </label>
      <button
        className="primary-button"
        type="submit"
      >
        Create project
      </button>
    </form>
  );
}

function InviteForm({ token, onSubmit }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  if (token) {
    const link = `${window.location.origin}/invite/${token}`;
    return (
      <div className="invite-result">
        <p>
          Share this secure invitation link with the
          teammate. It expires in seven days.
        </p>
        <input readOnly value={link} />
        <button
          className="secondary-button"
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(link)
          }
        >
          Copy invitation link
        </button>
      </div>
    );
  }

  return (
    <form
      className="product-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({ email, role });
      }}
    >
      <label>
        Email address
        <input
          autoFocus
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          required
        />
      </label>
      <label>
        Workspace role
        <select
          value={role}
          onChange={(event) =>
            setRole(event.target.value)
          }
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button
        className="primary-button"
        type="submit"
      >
        Create invitation
      </button>
    </form>
  );
}

function TaskForm({
  form,
  setForm,
  members,
  editing,
  onSubmit,
  onDelete,
  comments,
  onComment,
  taskId,
}) {
  const [comment, setComment] = useState("");
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    if (taskId) {
      void apiRequest(`/tasks/${taskId}/attachments`).then(
        (response) => setAttachments(response.data.attachments),
      );
    }
  }, [taskId]);
  return (
    <form
      className="product-form"
      onSubmit={onSubmit}
    >
      <label>
        Task title
        <input
          autoFocus
          value={form.title}
          onChange={(event) =>
            setForm({
              ...form,
              title: event.target.value,
            })
          }
          required
        />
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(event) =>
            setForm({
              ...form,
              description: event.target.value,
            })
          }
        />
      </label>
      <div className="form-row">
        <label>
          Priority
          <select
            value={form.priority}
            onChange={(event) =>
              setForm({
                ...form,
                priority: event.target.value,
              })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <label>
          Due date
          <input
            type="date"
            value={form.dueDate}
            onChange={(event) =>
              setForm({
                ...form,
                dueDate: event.target.value,
              })
            }
          />
        </label>
      </div>
      <label>
        Assignee
        <select
          value={form.assigneeIds[0] ?? ""}
          onChange={(event) =>
            setForm({
              ...form,
              assigneeIds: event.target.value
                ? [event.target.value]
                : [],
            })
          }
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option
              key={member.userId}
              value={member.userId}
            >
              {member.user?.name ??
                member.userId}
            </option>
          ))}
        </select>
      </label>
      <label>
        Labels
        <input
          value={form.labels}
          placeholder="design, frontend"
          onChange={(event) =>
            setForm({
              ...form,
              labels: event.target.value,
            })
          }
        />
      </label>
      <div className="modal-actions">
        {editing && (
          <button
            className="danger-button"
            type="button"
            onClick={onDelete}
          >
            Delete task
          </button>
        )}
        <button
          className="primary-button"
          type="submit"
        >
          {editing ? "Save changes" : "Create task"}
        </button>
      </div>
      {editing && (
        <section className="task-comments">
          <h3>Files</h3>
          <input type="file" onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const body = new FormData();
            body.append("file", file);
            const response = await apiRequest(`/tasks/${taskId}/attachments`, { method: "POST", body });
            setAttachments([...attachments, response.data.attachment]);
          }} />
          {attachments.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer">{item.originalName}</a>)}
          <h3>Comments</h3>
          {comments.map((item) => (
            <article key={item.id}>
              <strong>{item.author?.name ?? "Team member"}</strong>
              <p>{item.content}</p>
            </article>
          ))}
          <div>
            <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment" />
            <button className="secondary-button" type="button" onClick={async () => {
              if (!comment.trim()) return;
              await onComment(comment);
              setComment("");
            }}>Comment</button>
          </div>
        </section>
      )}
    </form>
  );
}

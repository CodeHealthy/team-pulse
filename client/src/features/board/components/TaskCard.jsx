import {
  CalendarDays,
  CheckSquare,
  GripVertical,
  MessageSquare,
  Paperclip,
} from "lucide-react";

import Badge from "../../../shared/components/ui/Badge";
import { formatDate } from "../../../shared/utils/date-format";

const PRIORITY_TONES = {
  low: "success",
  medium: "info",
  high: "warning",
  urgent: "danger",
};

const CURRENT_TIME = Date.now();

function AssigneeAvatars({ assigneeIds, members }) {
  const assignees = assigneeIds
    .map((userId) =>
      members.find((member) => member.userId === userId),
    )
    .filter(Boolean)
    .slice(0, 3);

  if (assignees.length === 0) {
    return null;
  }

  return (
    <span
      className="task-assignees"
      aria-label={assignees
        .map(
          (member) =>
            member.user?.name ?? "Team member",
        )
        .join(", ")}
    >
      {assignees.map((member) => {
        const name =
          member.user?.name ?? "Team member";

        return (
          <span
            key={member.userId}
            title={name}
            aria-hidden="true"
          >
            {name.charAt(0).toUpperCase()}
          </span>
        );
      })}
    </span>
  );
}

function getChecklistProgress(task) {
  if (!Array.isArray(task.checklist)) {
    return null;
  }

  return {
    complete: task.checklist.filter(
      (item) => item.completed,
    ).length,
    total: task.checklist.length,
  };
}

export default function TaskCard({
  task,
  members,
  datePreferences,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
}) {
  const checklist = getChecklistProgress(task);
  const dueDate = task.dueDate
    ? new Date(task.dueDate)
    : null;
  const overdue =
    dueDate &&
    dueDate.getTime() < CURRENT_TIME &&
    !task.completedAt;
  const commentCount =
    task.commentCount ??
    (Array.isArray(task.comments)
      ? task.comments.length
      : null);
  const attachmentCount =
    task.attachmentCount ??
    (Array.isArray(task.attachments)
      ? task.attachments.length
      : null);

  return (
    <button
      className={[
        "task-card",
        dragging ? "is-dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
    >
      <span className="task-card-grip">
        <GripVertical aria-hidden="true" />
      </span>

      <span className="task-card-badges">
        <Badge
          tone={PRIORITY_TONES[task.priority]}
        >
          {task.priority}
        </Badge>
        {(task.labels ?? []).map((label) => (
          <Badge key={label}>{label}</Badge>
        ))}
      </span>

      <strong>{task.title}</strong>

      <span className="task-card-footer">
        <span className="task-card-meta">
          {dueDate && (
            <span
              className={
                overdue ? "task-due overdue" : "task-due"
              }
              title={`Due ${formatDate(
                dueDate,
                datePreferences,
              )}`}
            >
              <CalendarDays aria-hidden="true" />
              {formatDate(
                dueDate,
                datePreferences,
              )}
            </span>
          )}
          {commentCount > 0 && (
            <span title={`${commentCount} comments`}>
              <MessageSquare aria-hidden="true" />
              {commentCount}
            </span>
          )}
          {attachmentCount > 0 && (
            <span title={`${attachmentCount} attachments`}>
              <Paperclip aria-hidden="true" />
              {attachmentCount}
            </span>
          )}
          {checklist?.total > 0 && (
            <span
              title={`${checklist.complete} of ${checklist.total} checklist items complete`}
            >
              <CheckSquare aria-hidden="true" />
              {checklist.complete}/{checklist.total}
            </span>
          )}
        </span>
        <AssigneeAvatars
          assigneeIds={task.assigneeIds ?? []}
          members={members}
        />
      </span>
    </button>
  );
}

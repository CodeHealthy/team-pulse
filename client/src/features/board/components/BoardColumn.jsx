import {
  Ellipsis,
  Plus,
} from "lucide-react";

import DropdownMenu from "../../../shared/components/ui/DropdownMenu";
import EmptyColumnState from "./EmptyColumnState";
import TaskCard from "./TaskCard";

export default function BoardColumn({
  column,
  tasks,
  totalTaskCount,
  members,
  draggingTaskId,
  dragOver,
  filtered,
  onAddTask,
  onOpenTask,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  onDrop,
}) {
  return (
    <article
      className={[
        "kanban-column",
        dragOver ? "is-drag-over" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="column-header">
        <span
          className="column-status"
          aria-hidden="true"
        />
        <h2>{column.name}</h2>
        <span
          className="column-task-count"
          aria-label={`${totalTaskCount} tasks`}
        >
          {filtered
            ? `${tasks.length}/${totalTaskCount}`
            : totalTaskCount}
        </span>
        <DropdownMenu
          className="column-menu"
          label={`${column.name} actions`}
          icon={Ellipsis}
        >
          <button type="button" onClick={onAddTask}>
            <Plus aria-hidden="true" />
            Add task
          </button>
        </DropdownMenu>
      </header>

      <div className="task-list">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            members={members}
            dragging={draggingTaskId === task.id}
            onDragStart={(event) =>
              onDragStart(event, task.id)
            }
            onDragEnd={onDragEnd}
            onOpen={() => onOpenTask(task)}
          />
        ))}
        {tasks.length === 0 && (
          <EmptyColumnState
            filtered={filtered}
            onAddTask={onAddTask}
          />
        )}
      </div>

      <button
        className="add-task-button"
        type="button"
        onClick={onAddTask}
      >
        <Plus aria-hidden="true" />
        Add task
      </button>
    </article>
  );
}

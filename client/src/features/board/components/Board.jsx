import { useMemo, useState } from "react";

import BoardColumn from "./BoardColumn";

export default function Board({
  columns,
  tasks,
  members,
  datePreferences,
  query,
  priority,
  onNewTask,
  onOpenTask,
  onDrop,
}) {
  const [draggingTaskId, setDraggingTaskId] =
    useState(null);
  const [dragOverColumnId, setDragOverColumnId] =
    useState(null);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = Boolean(
    normalizedQuery || priority !== "all",
  );

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesPriority =
          priority === "all" ||
          task.priority === priority;
        const searchableText = [
          task.title,
          task.description,
          ...(task.labels ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          matchesPriority &&
          (!normalizedQuery ||
            searchableText.includes(normalizedQuery))
        );
      }),
    [normalizedQuery, priority, tasks],
  );

  function handleDragStart(event, taskId) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/task-id",
      taskId,
    );
    setDraggingTaskId(taskId);
  }

  function clearDragState() {
    setDraggingTaskId(null);
    setDragOverColumnId(null);
  }

  return (
    <section
      className="board-area"
      aria-label="Project board"
    >
      <div className="kanban-board">
        {columns.map((column) => {
          const columnTasks = visibleTasks.filter(
            (task) => task.columnId === column.id,
          );
          const totalTaskCount = tasks.filter(
            (task) => task.columnId === column.id,
          ).length;

          return (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={columnTasks}
              totalTaskCount={totalTaskCount}
              members={members}
              datePreferences={datePreferences}
              draggingTaskId={draggingTaskId}
              dragOver={
                dragOverColumnId === column.id
              }
              filtered={filtered}
              onAddTask={() => onNewTask(column.id)}
              onOpenTask={onOpenTask}
              onDragStart={handleDragStart}
              onDragEnd={clearDragState}
              onDragEnter={() =>
                setDragOverColumnId(column.id)
              }
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget,
                  )
                ) {
                  setDragOverColumnId(null);
                }
              }}
              onDrop={(event) => {
                onDrop(event, column.id);
                clearDragState();
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

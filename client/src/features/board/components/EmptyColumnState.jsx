import { Plus } from "lucide-react";

export default function EmptyColumnState({
  filtered,
  onAddTask,
}) {
  return (
    <div className="empty-column-state">
      <p>
        {filtered
          ? "No tasks match these filters."
          : "No tasks in this column yet."}
      </p>
      {!filtered && (
        <button type="button" onClick={onAddTask}>
          <Plus aria-hidden="true" />
          Add the first task
        </button>
      )}
    </div>
  );
}

import { ListFilter } from "lucide-react";

export default function FilterButton({
  value,
  onChange,
}) {
  return (
    <label
      className={
        value === "all"
          ? "board-filter"
          : "board-filter active"
      }
    >
      <ListFilter aria-hidden="true" />
      <span>Filter</span>
      <select
        aria-label="Filter tasks by priority"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        <option value="all">All priorities</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </label>
  );
}

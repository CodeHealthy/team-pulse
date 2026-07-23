import { Columns3 } from "lucide-react";

export default function ViewSwitcher() {
  return (
    <div
      className="view-switcher"
      aria-label="Project view"
    >
      <button
        className="view-switcher-item active"
        type="button"
        aria-current="page"
      >
        <Columns3 aria-hidden="true" />
        Board
      </button>
    </div>
  );
}

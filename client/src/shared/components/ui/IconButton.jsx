import { useId } from "react";

export default function IconButton({
  label,
  icon: Icon,
  variant = "ghost",
  className = "",
  ...props
}) {
  const tooltipId = useId();

  return (
    <span className="ui-tooltip">
      <button
        className={[
          "ui-icon-button",
          `ui-icon-button-${variant}`,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={label}
        aria-describedby={tooltipId}
        {...props}
      >
        <Icon aria-hidden="true" />
      </button>
      <span
        className="ui-tooltip-content"
        id={tooltipId}
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}

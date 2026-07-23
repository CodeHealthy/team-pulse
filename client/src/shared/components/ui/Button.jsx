import { LoaderCircle } from "lucide-react";

export default function Button({
  variant = "secondary",
  size = "medium",
  loading = false,
  icon: Icon,
  children,
  className = "",
  disabled,
  ...props
}) {
  const classes = [
    "ui-button",
    `ui-button-${variant}`,
    `ui-button-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderCircle
          className="ui-button-spinner"
          aria-hidden="true"
        />
      ) : (
        Icon && <Icon aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

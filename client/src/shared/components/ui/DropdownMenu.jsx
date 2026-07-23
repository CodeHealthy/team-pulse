export default function DropdownMenu({
  label,
  icon: Icon,
  children,
  className = "",
}) {
  return (
    <details
      className={["ui-dropdown", className]
        .filter(Boolean)
        .join(" ")}
    >
      <summary aria-label={label} title={label}>
        <Icon aria-hidden="true" />
      </summary>
      <div className="ui-dropdown-menu">
        {children}
      </div>
    </details>
  );
}

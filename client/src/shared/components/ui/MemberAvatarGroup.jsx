function getInitial(name) {
  return name?.trim().charAt(0).toUpperCase() || "?";
}

export default function MemberAvatarGroup({
  members,
  onlineUserIds = [],
  limit = 4,
}) {
  const visibleMembers = members.slice(0, limit);
  const remaining = members.length - visibleMembers.length;

  return (
    <div
      className="member-avatar-group"
      aria-label={`${members.length} workspace members`}
    >
      {visibleMembers.map((member) => {
        const name = member.user?.name ?? "Team member";
        const online = onlineUserIds.includes(member.userId);

        return (
          <span
            className="member-avatar"
            key={member.userId}
            title={`${name}${online ? " · Online" : ""}`}
            aria-label={`${name}${online ? ", online" : ""}`}
          >
            {getInitial(name)}
            {online && (
              <span
                className="member-avatar-presence"
                aria-hidden="true"
              />
            )}
          </span>
        );
      })}
      {remaining > 0 && (
        <span
          className="member-avatar member-avatar-more"
          aria-label={`${remaining} more members`}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}

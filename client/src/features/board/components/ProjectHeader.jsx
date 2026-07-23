import { useState } from "react";
import {
  Bell,
  ChevronRight,
  MessageSquare,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react";

import Button from "../../../shared/components/ui/Button";
import DropdownMenu from "../../../shared/components/ui/DropdownMenu";
import MemberAvatarGroup from "../../../shared/components/ui/MemberAvatarGroup";
import FilterButton from "./FilterButton";
import ViewSwitcher from "./ViewSwitcher";

export default function ProjectHeader({
  workspace,
  project,
  members,
  onlineUserIds,
  unreadMessages,
  unreadNotifications,
  query,
  priority,
  onQueryChange,
  onPriorityChange,
  onInvite,
  onOpenChat,
  onOpenNotifications,
  onOpenTools,
  onNewColumn,
}) {
  const [copied, setCopied] = useState(false);

  async function copyShareLink() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(
        window.location.href,
      );
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <header className="project-header">
      <div className="project-header-main">
        <div className="project-heading">
          <nav
            className="project-breadcrumbs"
            aria-label="Breadcrumb"
          >
            <span>{workspace.name}</span>
            {project && (
              <>
                <ChevronRight aria-hidden="true" />
                <span aria-current="page">
                  {project.name}
                </span>
              </>
            )}
          </nav>
          <h1>
            {project?.name ?? "Workspace overview"}
          </h1>
          {project?.description && (
            <p>{project.description}</p>
          )}
        </div>

        <div className="project-header-actions">
          <MemberAvatarGroup
            members={members}
            onlineUserIds={onlineUserIds}
          />
          {["owner", "admin"].includes(
            workspace.role,
          ) && (
            <Button
              icon={UserPlus}
              size="small"
              onClick={onInvite}
            >
              Invite
            </Button>
          )}
          <Button
            icon={Share2}
            size="small"
            onClick={copyShareLink}
          >
            {copied ? "Copied" : "Share"}
          </Button>
          <DropdownMenu
            className="project-more-menu"
            label="More project actions"
            icon={SlidersHorizontal}
          >
            <button type="button" onClick={onOpenTools}>
              Workspace tools
            </button>
            {project && (
              <button type="button" onClick={onNewColumn}>
                Add board column
              </button>
            )}
          </DropdownMenu>
        </div>
      </div>

      <div className="project-header-toolbar">
        <ViewSwitcher />
        {project && (
          <div className="board-controls">
            <label className="board-search">
              <Search aria-hidden="true" />
              <span className="sr-only">Search tasks</span>
              <input
                type="search"
                value={query}
                placeholder="Search tasks"
                onChange={(event) =>
                  onQueryChange(event.target.value)
                }
              />
            </label>
            <FilterButton
              value={priority}
              onChange={onPriorityChange}
            />
          </div>
        )}
        <div className="project-utility-actions">
          <Button
            icon={MessageSquare}
            variant="ghost"
            size="small"
            onClick={onOpenChat}
          >
            Channels
            {unreadMessages > 0 && (
              <span className="notification-count">
                {unreadMessages}
              </span>
            )}
          </Button>
          <Button
            icon={Bell}
            variant="ghost"
            size="small"
            onClick={onOpenNotifications}
          >
            Inbox
            {unreadNotifications > 0 && (
              <span className="notification-count">
                {unreadNotifications}
              </span>
            )}
          </Button>
          {project && (
            <Button
              icon={Plus}
              variant="primary"
              size="small"
              onClick={onNewColumn}
            >
              Add column
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

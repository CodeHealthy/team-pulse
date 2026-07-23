import {
  LogOut,
  Plus,
} from "lucide-react";

import TeamPulseLogo from "../../../shared/components/brand/TeamPulseLogo";
import IconButton from "../../../shared/components/ui/IconButton";

export default function Sidebar({
  user,
  workspaces,
  projects,
  selectedWorkspaceId,
  selectedProjectId,
  onCreateWorkspace,
  onCreateProject,
  onOpenWorkspace,
  onOpenProject,
  onOpenSettings,
  onSignOut,
}) {
  return (
    <aside className="product-sidebar">
      <div className="sidebar-brand">
        <TeamPulseLogo variant="light" size={32} />
      </div>

      <nav
        className="workspace-nav"
        aria-label="Workspaces"
      >
        <div className="nav-heading">
          <span>Workspaces</span>
          <IconButton
            label="Create workspace"
            icon={Plus}
            onClick={onCreateWorkspace}
          />
        </div>
        {workspaces.map((workspace) => (
          <button
            className={
              workspace.id === selectedWorkspaceId
                ? "nav-item active"
                : "nav-item"
            }
            key={workspace.id}
            type="button"
            title={workspace.name}
            aria-current={
              workspace.id === selectedWorkspaceId
                ? "page"
                : undefined
            }
            onClick={() =>
              onOpenWorkspace(workspace.id)
            }
          >
            <span className="workspace-avatar">
              {workspace.name.charAt(0)}
            </span>
            <span className="nav-item-label">
              {workspace.name}
            </span>
          </button>
        ))}
      </nav>

      {selectedWorkspaceId && (
        <nav
          className="project-nav"
          aria-label="Projects"
        >
          <div className="nav-heading">
            <span>Projects</span>
            <IconButton
              label="Create project"
              icon={Plus}
              onClick={onCreateProject}
            />
          </div>
          {projects.map((project) => (
            <button
              className={
                project.id === selectedProjectId
                  ? "nav-item active"
                  : "nav-item"
              }
              key={project.id}
              type="button"
              title={project.name}
              aria-current={
                project.id === selectedProjectId
                  ? "page"
                  : undefined
              }
              onClick={() =>
                onOpenProject(project.id)
              }
            >
              <span
                className="project-color"
                style={{
                  backgroundColor: project.color,
                }}
              />
              <span className="nav-item-label">
                {project.name}
              </span>
            </button>
          ))}
        </nav>
      )}

      <div className="sidebar-user">
        <button
          className="sidebar-profile-button"
          type="button"
          aria-label="Open profile and settings"
          onClick={onOpenSettings}
        >
          <span className="user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <span className="sidebar-user-copy">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </span>
        </button>
        <IconButton
          className="sidebar-sign-out"
          label="Sign out"
          icon={LogOut}
          onClick={onSignOut}
        />
      </div>
    </aside>
  );
}

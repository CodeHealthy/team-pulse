import {
  Check,
  Shield,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useDispatch,
  useSelector,
} from "react-redux";

import {
  updatePersonalSettings,
  updatePrivacySettings,
  updateProfile,
} from "../auth/auth-slice";
import Button from "../../shared/components/ui/Button";
import IconButton from "../../shared/components/ui/IconButton";

const TIMEZONES =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : ["UTC"];

const TABS = [
  {
    id: "profile",
    label: "Profile",
    icon: UserRound,
  },
  {
    id: "personal",
    label: "Personal",
    icon: SlidersHorizontal,
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: Shield,
  },
];

export default function SettingsPanel({ onClose }) {
  const dispatch = useDispatch();
  const dialogRef = useRef(null);
  const user = useSelector((state) => state.auth.user);
  const status = useSelector(
    (state) => state.auth.settingsStatus,
  );
  const error = useSelector(
    (state) => state.auth.settingsError,
  );
  const [activeTab, setActiveTab] =
    useState("profile");
  const [savedSection, setSavedSection] =
    useState(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    dialog
      ?.querySelector(focusableSelector)
      ?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusable = [
        ...dialog.querySelectorAll(
          focusableSelector,
        ),
      ];
      const first = focusable[0];
      const last = focusable.at(-1);

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
      previousFocus?.focus();
    };
  }, [onClose]);

  async function save(section, action) {
    setSavedSection(null);
    const result = await dispatch(action);

    if (!result.error) {
      setSavedSection(section);
    }
  }

  return (
    <div
      className="settings-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        ref={dialogRef}
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="settings-header">
          <div>
            <p className="eyebrow">Your account</p>
            <h2 id="settings-title">Settings</h2>
          </div>
          <IconButton
            label="Close settings"
            icon={X}
            onClick={onClose}
          />
        </header>

        <div className="settings-layout">
          <nav
            className="settings-tabs"
            aria-label="Settings sections"
          >
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                className={
                  activeTab === id ? "active" : ""
                }
                type="button"
                key={id}
                aria-current={
                  activeTab === id
                    ? "page"
                    : undefined
                }
                onClick={() => {
                  setActiveTab(id);
                  setSavedSection(null);
                }}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          <main className="settings-content">
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {savedSection === activeTab && (
              <p
                className="settings-success"
                role="status"
              >
                <Check aria-hidden="true" />
                Changes saved
              </p>
            )}

            {activeTab === "profile" && (
              <ProfileSettings
                user={user}
                loading={status === "loading"}
                onSave={(values) =>
                  save(
                    "profile",
                    updateProfile(values),
                  )
                }
              />
            )}
            {activeTab === "personal" && (
              <PersonalSettings
                settings={user.personalSettings}
                loading={status === "loading"}
                onSave={(values) =>
                  save(
                    "personal",
                    updatePersonalSettings(values),
                  )
                }
              />
            )}
            {activeTab === "privacy" && (
              <PrivacySettings
                settings={user.privacySettings}
                loading={status === "loading"}
                onSave={(values) =>
                  save(
                    "privacy",
                    updatePrivacySettings(values),
                  )
                }
              />
            )}
          </main>
        </div>
      </section>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
  loading,
  onSubmit,
}) {
  return (
    <form
      className="settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <div className="settings-section-heading">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
      <footer>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
        >
          Save changes
        </Button>
      </footer>
    </form>
  );
}

function ProfileSettings({ user, loading, onSave }) {
  const [values, setValues] = useState({
    name: user.name,
    jobTitle: user.jobTitle ?? "",
  });

  return (
    <SettingsSection
      title="Profile information"
      description="Control how your identity appears to teammates."
      loading={loading}
      onSubmit={() => onSave(values)}
    >
      <div className="settings-profile-summary">
        <span className="settings-avatar">
          {values.name.charAt(0).toUpperCase() || "?"}
        </span>
        <div>
          <strong>{values.name || "Your name"}</strong>
          <span>{user.email}</span>
        </div>
      </div>
      <label>
        Display name
        <input
          autoFocus
          required
          minLength={2}
          maxLength={80}
          value={values.name}
          onChange={(event) =>
            setValues({
              ...values,
              name: event.target.value,
            })
          }
        />
      </label>
      <label>
        Job title
        <input
          maxLength={100}
          placeholder="e.g. Product designer"
          value={values.jobTitle}
          onChange={(event) =>
            setValues({
              ...values,
              jobTitle: event.target.value,
            })
          }
        />
      </label>
      <label>
        Email address
        <input
          type="email"
          value={user.email}
          readOnly
          aria-describedby="email-help"
        />
        <small id="email-help">
          Email changes require account verification and
          are not available here yet.
        </small>
      </label>
    </SettingsSection>
  );
}

function PersonalSettings({
  settings = {},
  loading,
  onSave,
}) {
  const [values, setValues] = useState({
    timezone: settings.timezone ?? "UTC",
    dateFormat:
      settings.dateFormat ?? "month-day-year",
    weekStartsOn:
      settings.weekStartsOn ?? "monday",
    density: settings.density ?? "comfortable",
  });

  return (
    <SettingsSection
      title="Personal preferences"
      description="Adapt dates and interface density to your working style."
      loading={loading}
      onSubmit={() => onSave(values)}
    >
      <label>
        Timezone
        <input
          list="timezone-options"
          required
          value={values.timezone}
          onChange={(event) =>
            setValues({
              ...values,
              timezone: event.target.value,
            })
          }
        />
        <datalist id="timezone-options">
          {TIMEZONES.map((timezone) => (
            <option key={timezone} value={timezone} />
          ))}
        </datalist>
      </label>
      <div className="settings-form-row">
        <label>
          Date format
          <select
            value={values.dateFormat}
            onChange={(event) =>
              setValues({
                ...values,
                dateFormat: event.target.value,
              })
            }
          >
            <option value="month-day-year">
              MM/DD/YYYY
            </option>
            <option value="day-month-year">
              DD/MM/YYYY
            </option>
            <option value="year-month-day">
              YYYY-MM-DD
            </option>
          </select>
        </label>
        <label>
          Week starts on
          <select
            value={values.weekStartsOn}
            onChange={(event) =>
              setValues({
                ...values,
                weekStartsOn: event.target.value,
              })
            }
          >
            <option value="monday">Monday</option>
            <option value="sunday">Sunday</option>
          </select>
        </label>
      </div>
      <fieldset className="settings-choice-group">
        <legend>Interface density</legend>
        {[
          {
            value: "comfortable",
            label: "Comfortable",
            description:
              "More breathing room between controls and tasks.",
          },
          {
            value: "compact",
            label: "Compact",
            description:
              "Fit more project information on screen.",
          },
        ].map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name="density"
              value={option.value}
              checked={values.density === option.value}
              onChange={(event) =>
                setValues({
                  ...values,
                  density: event.target.value,
                })
              }
            />
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </label>
        ))}
      </fieldset>
    </SettingsSection>
  );
}

function PrivacySettings({
  settings = {},
  loading,
  onSave,
}) {
  const [values, setValues] = useState({
    showOnlineStatus:
      settings.showOnlineStatus ?? true,
    showEmailToWorkspaceMembers:
      settings.showEmailToWorkspaceMembers ?? true,
  });

  return (
    <SettingsSection
      title="Privacy controls"
      description="Choose what other workspace members can see about you."
      loading={loading}
      onSubmit={() => onSave(values)}
    >
      <div className="privacy-settings-list">
        <SwitchSetting
          label="Show online status"
          description="Allow teammates to see when you are connected to TeamPulse."
          checked={values.showOnlineStatus}
          onChange={(checked) =>
            setValues({
              ...values,
              showOnlineStatus: checked,
            })
          }
        />
        <SwitchSetting
          label="Show email to workspace members"
          description="Include your email address in workspace member lists."
          checked={
            values.showEmailToWorkspaceMembers
          }
          onChange={(checked) =>
            setValues({
              ...values,
              showEmailToWorkspaceMembers:
                checked,
            })
          }
        />
      </div>
      <p className="privacy-note">
        Workspace owners can still identify accounts when
        required for administration and security.
      </p>
    </SettingsSection>
  );
}

function SwitchSetting({
  label,
  description,
  checked,
  onChange,
}) {
  return (
    <label className="switch-setting">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />
    </label>
  );
}

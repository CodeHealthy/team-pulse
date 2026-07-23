import { useState } from "react";
import {
  Link,
  useParams,
} from "react-router";

import { apiRequest } from "../auth/auth-api";
import TeamPulseLogo from "../../shared/components/brand/TeamPulseLogo";

export default function InvitationPage() {
  const { token } = useParams();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  async function accept() {
    setStatus("loading");
    setError(null);

    try {
      await apiRequest(
        `/invitations/${token}/accept`,
        { method: "POST" },
      );
      setStatus("accepted");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("idle");
    }
  }

  return (
    <main className="invitation-page">
      <TeamPulseLogo size={42} />
      <section>
        <p className="eyebrow">
          Workspace invitation
        </p>
        <h1>
          Join your team on TeamPulse
        </h1>
        {status === "accepted" ? (
          <>
            <p>
              You have joined the workspace
              successfully.
            </p>
            <Link
              className="primary-button link-button"
              to="/"
            >
              Open TeamPulse
            </Link>
          </>
        ) : (
          <>
            <p>
              Accept this invitation to access the
              workspace and its projects.
            </p>
            {error && (
              <p className="form-error">
                {error}
              </p>
            )}
            <button
              className="primary-button"
              type="button"
              disabled={status === "loading"}
              onClick={accept}
            >
              {status === "loading"
                ? "Joining..."
                : "Accept invitation"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

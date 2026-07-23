import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router";
import {
  useDispatch,
  useSelector,
} from "react-redux";

import TeamPulseLogo from "../../shared/components/brand/TeamPulseLogo";
import {
  clearAuthError,
  loginUser,
  registerUser,
} from "./auth-slice";

const PAGE_CONTENT = Object.freeze({
  login: {
    eyebrow: "Welcome back",
    title: "Sign in to TeamPulse",
    description:
      "Continue organizing projects and moving work forward with your team.",
    submitLabel: "Sign in",
    alternateText: "New to TeamPulse?",
    alternateLabel: "Create an account",
    alternatePath: "/register",
  },
  register: {
    eyebrow: "Get started",
    title: "Create your TeamPulse account",
    description:
      "Build a shared workspace where projects, tasks, and conversations stay connected.",
    submitLabel: "Create account",
    alternateText: "Already have an account?",
    alternateLabel: "Sign in",
    alternatePath: "/login",
  },
});

export default function AuthPage({ mode }) {
  const content = PAGE_CONTENT[mode];
  const isRegister = mode === "register";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, status, error } = useSelector(
    (state) => state.auth,
  );
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch, mode]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const action = isRegister
      ? registerUser(form)
      : loginUser({
          email: form.email,
          password: form.password,
        });

    const result = await dispatch(action);

    if (
      registerUser.fulfilled.match(result) ||
      loginUser.fulfilled.match(result)
    ) {
      navigate(location.state?.from ?? "/", {
        replace: true,
      });
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-brand-panel">
        <TeamPulseLogo variant="light" size={44} />

        <div className="auth-brand-copy">
          <p className="eyebrow eyebrow-light">
            Work in one rhythm
          </p>
          <h1>
            Projects, tasks, and team
            conversations in one place.
          </h1>
          <p>
            Keep execution visible and communication
            connected to the work that matters.
          </p>
        </div>

        <p className="auth-brand-footer">
          Project management with integrated
          real-time collaboration.
        </p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-card">
          <div className="mobile-logo">
            <TeamPulseLogo size={36} />
          </div>

          <p className="eyebrow">{content.eyebrow}</p>
          <h2>{content.title}</h2>
          <p className="form-description">
            {content.description}
          </p>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <label>
                Full name
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </label>
            )}

            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={
                  isRegister
                    ? "new-password"
                    : "current-password"
                }
                minLength={isRegister ? 8 : 1}
                maxLength={128}
                value={form.password}
                onChange={handleChange}
                required
              />
            </label>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={status === "loading"}
            >
              {status === "loading"
                ? "Please wait..."
                : content.submitLabel}
            </button>
          </form>

          <p className="alternate-auth">
            {content.alternateText}{" "}
            <Link
              to={content.alternatePath}
              state={location.state}
            >
              {content.alternateLabel}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

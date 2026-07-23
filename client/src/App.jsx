import { useEffect } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router";
import {
  useDispatch,
  useSelector,
} from "react-redux";

import AuthPage from "./features/auth/AuthPage";
import { initializeAuth } from "./features/auth/auth-slice";
import HomePage from "./features/home/HomePage";
import InvitationPage from "./features/workspaces/InvitationPage";
import TeamPulseLogo from "./shared/components/brand/TeamPulseLogo";

function SessionGate() {
  const dispatch = useDispatch();
  const initialized = useSelector(
    (state) => state.auth.initialized,
  );

  useEffect(() => {
    if (!initialized) {
      dispatch(initializeAuth());
    }
  }, [dispatch, initialized]);

  if (!initialized) {
    return (
      <main className="session-loader">
        <TeamPulseLogo size={42} />
        <p>Preparing your workspace...</p>
      </main>
    );
  }

  return <Outlet />;
}

function ProtectedRoute() {
  const location = useLocation();
  const user = useSelector(
    (state) => state.auth.user,
  );

  return user ? (
    <Outlet />
  ) : (
    <Navigate
      to="/login"
      replace
      state={{ from: location.pathname }}
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<SessionGate />}>
        <Route
          path="/login"
          element={<AuthPage mode="login" />}
        />
        <Route
          path="/register"
          element={<AuthPage mode="register" />}
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/invite/:token"
            element={<InvitationPage />}
          />
        </Route>

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Route>
    </Routes>
  );
}

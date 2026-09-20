import { useEffect, useState } from "react";
import {
  House,
  LayoutDashboard,
  LogIn,
  Menu,
  UserPlus,
  X,
} from "lucide-react";
import {
  api,
  clearPendingGuestLinks,
  clearToken,
  getPendingGuestLinks,
  getStoredUser,
  getToken,
  saveSession,
} from "./api";
import AuthModal from "./components/AuthModal";
import Dashboard from "./components/Dashboard";
import Home from "./components/Home";

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("home");
  const [authMode, setAuthMode] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      const token = getToken();
      const storedUser = getStoredUser();

      if (!token) {
        setCheckingAuth(false);
        return;
      }

      if (storedUser) {
        setUser(storedUser);
      }

      try {
        const data = await api.getMe();
        setUser(data.user);
        saveSession(token, data.user);
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          clearToken();
          setUser(null);
        }
      } finally {
        setCheckingAuth(false);
      }
    }

    restoreSession();
  }, []);

  function openAuth(mode) {
    setAuthMode(mode);
    setNavOpen(false);
  }

  async function handleAuthSuccess(token, nextUser) {
    saveSession(token, nextUser);
    setUser(nextUser);
    setAuthMode(null);

    const pendingLinks = getPendingGuestLinks();
    if (pendingLinks.length > 0) {
      try {
        await api.claimLinks(pendingLinks);
        clearPendingGuestLinks();
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          clearToken();
          setUser(null);
        }
      }
    }
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setView("home");
    setNavOpen(false);
  }

  function changeView(nextView) {
    setView(nextView);
    setNavOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="navbar-shell">
          <button
            className="brand-button"
            type="button"
            onClick={() => changeView("home")}
          >
            <span>Middleman</span>
          </button>

          <button
            className="menu-toggle"
            type="button"
            aria-label={navOpen ? "close menu" : "open menu"}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((value) => !value)}
          >
            {navOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>

          <div className={navOpen ? "nav-menu open" : "nav-menu"}>
            <nav className="nav-actions" aria-label="primary navigation">
              <button
                className={view === "home" ? "nav-link active" : "nav-link"}
                type="button"
                onClick={() => changeView("home")}
              >
                <House aria-hidden="true" />
                Home
              </button>

              {user && (
                <button
                  className={
                    view === "dashboard" ? "nav-link active" : "nav-link"
                  }
                  type="button"
                  onClick={() => changeView("dashboard")}
                >
                  <LayoutDashboard aria-hidden="true" />
                  Dashboard
                </button>
              )}
            </nav>

            <div className="account-actions">
              {user ? (
                <>
                  <span className="user-pill">{user.userName}</span>
                  <button
                    className="secondary-action logout-action"
                    type="button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => openAuth("login")}
                  >
                    <LogIn aria-hidden="true" />
                    Login
                  </button>
                  <button
                    className="primary-small"
                    type="button"
                    onClick={() => openAuth("register")}
                  >
                    <UserPlus aria-hidden="true" />
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {checkingAuth ? (
        <main className="loading-page">Checking session...</main>
      ) : view === "dashboard" && user ? (
        <Dashboard user={user} />
      ) : (
        <Home />
      )}

      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onModeChange={setAuthMode}
          onSuccess={handleAuthSuccess}
        />
      )}

      <footer className="site-footer">
        made by <a href="#">thekavyashah</a>
      </footer>
    </div>
  );
}

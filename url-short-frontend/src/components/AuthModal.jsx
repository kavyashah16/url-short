import { LogIn, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { api } from "../api";

const emptyValues = {
  userName: "",
  password: "",
  confirmPassword: "",
};

export default function AuthModal({ mode, onClose, onModeChange, onSuccess }) {
  const [values, setValues] = useState(emptyValues);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  function updateValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        userName: values.userName.trim(),
        password: values.password,
      };
      const data = isRegister
        ? await api.register({
            ...payload,
            confirmPassword: values.confirmPassword,
          })
        : await api.login(payload);
      await onSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
        <div className="modal-heading">
          <p>{isRegister ? "Start saving links" : "Welcome back"}</p>
          <h2 id="auth-title">{isRegister ? "Create account" : "Log in"}</h2>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="auth-userName">Username</label>
            <input
              id="auth-userName"
              type="text"
              value={values.userName}
              onChange={(event) => updateValue("userName", event.target.value)}
              minLength={2}
              maxLength={30}
              autoFocus
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={values.password}
              onChange={(event) => updateValue("password", event.target.value)}
              minLength={5}
              maxLength={100}
              required
            />
          </div>

          {isRegister && (
            <div className="field-group">
              <label htmlFor="auth-confirmPassword">Confirm password</label>
              <input
                id="auth-confirmPassword"
                type="password"
                value={values.confirmPassword}
                onChange={(event) =>
                  updateValue("confirmPassword", event.target.value)
                }
                minLength={5}
                maxLength={100}
                required
              />
            </div>
          )}

          {error && <p className="form-message error">{error}</p>}

          <button className="primary-action" type="submit" disabled={loading}>
            {isRegister ? (
              <UserPlus aria-hidden="true" />
            ) : (
              <LogIn aria-hidden="true" />
            )}
            {loading
              ? isRegister
                ? "Creating..."
                : "Logging in..."
              : isRegister
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        <button
          className="text-action"
          type="button"
          onClick={() => onModeChange(isRegister ? "login" : "register")}
        >
          {isRegister
            ? "Already have an account? Log in"
            : "New here? Create account"}
        </button>
      </section>
    </div>
  );
}

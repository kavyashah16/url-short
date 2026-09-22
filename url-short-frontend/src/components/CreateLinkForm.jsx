import { CalendarDays, Copy } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { addPendingGuestLink, api, shortUrl } from "../api";
import { isValidHttpUrl } from "../urlValidation";

const initialForm = {
  url: "",
  expiresAt: "",
  customAlias: "",
  password: "",
  clickLimit: "",
};

export default function CreateLinkForm({ onCreated, variant = "hero" }) {
  const [form, setForm] = useState(initialForm);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [createdCode, setCreatedCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const expiryInputRef = useRef(null);

  const createdUrl = useMemo(
    () => (createdCode ? shortUrl(createdCode) : ""),
    [createdCode],
  );

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function buildPayload() {
    const payload = { url: form.url.trim() };
    if (form.expiresAt) {
      payload.expiresAt = new Date(form.expiresAt).toISOString();
    }
    if (form.customAlias.trim()) {
      payload.customAlias = form.customAlias.trim();
    }
    if (form.password.trim()) {
      payload.password = form.password.trim();
    }
    if (form.clickLimit) {
      payload.clickLimit = Number(form.clickLimit);
    }
    return payload;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setCreatedCode("");

    if (!isValidHttpUrl(form.url)) {
      setError("Please enter a valid http or https URL.");
      return;
    }

    setLoading(true);

    try {
      const data = await api.createLink(buildPayload());
      setCreatedCode(data.shortCode);
      addPendingGuestLink(data.shortCode);
      setForm(initialForm);
      setShowAdvanced(false);
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!createdUrl) return;
    await navigator.clipboard.writeText(createdUrl);
  }

  function openExpiryPicker() {
    const input = expiryInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
  }

  return (
    <form
      className={`create-link-form ${variant}`}
      onSubmit={handleSubmit}
      autoComplete="off"
      noValidate
    >
      <div className="form-heading-row">
        <h2>Create short link</h2>
        <button
          className="advanced-toggle"
          type="button"
          aria-expanded={showAdvanced}
          onClick={() => setShowAdvanced((value) => !value)}
        >
          Advanced options
        </button>
      </div>

      <div className="field-group">
        <label htmlFor={`${variant}-url`}>Destination url</label>
        <input
          id={`${variant}-url`}
          type="url"
          placeholder="https://example.com/product/very-long-link"
          value={form.url}
          autoComplete="off"
          data-lpignore="true"
          onChange={(event) => updateField("url", event.target.value)}
          required
        />
      </div>

      <div className="field-group">
        <label htmlFor={`${variant}-alias`}>Custom alias (optional)</label>
        <input
          id={`${variant}-alias`}
          type="text"
          placeholder="launch-2026"
          value={form.customAlias}
          autoComplete="off"
          data-lpignore="true"
          onChange={(event) => updateField("customAlias", event.target.value)}
          minLength={3}
          maxLength={30}
        />
      </div>

      <div
        className={showAdvanced ? "advanced-panel open" : "advanced-panel"}
        aria-hidden={!showAdvanced}
      >
        <div className="advanced-grid">
          <div className="field-group date-field">
            <label htmlFor={`${variant}-expiresAt`}>Expiry date & time</label>
            <div className="input-with-icon">
              <input
                ref={expiryInputRef}
                id={`${variant}-expiresAt`}
                type="datetime-local"
                value={form.expiresAt}
                autoComplete="off"
                tabIndex={showAdvanced ? 0 : -1}
                onChange={(event) =>
                  updateField("expiresAt", event.target.value)
                }
              />
              <button
                type="button"
                aria-label="open expiry calendar"
                onClick={openExpiryPicker}
                tabIndex={showAdvanced ? 0 : -1}
              >
                <CalendarDays aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor={`${variant}-clickLimit`}>Click limit</label>
            <input
              id={`${variant}-clickLimit`}
              type="number"
              min="1"
              placeholder="250"
              value={form.clickLimit}
              autoComplete="off"
              tabIndex={showAdvanced ? 0 : -1}
              onChange={(event) =>
                updateField("clickLimit", event.target.value)
              }
            />
          </div>

          <div className="field-group">
            <label htmlFor={`${variant}-password`}>Password (optional)</label>
            <input
              id={`${variant}-password`}
              type="password"
              placeholder="optional access key"
              value={form.password}
              autoComplete="new-password"
              data-lpignore="true"
              tabIndex={showAdvanced ? 0 : -1}
              onChange={(event) => updateField("password", event.target.value)}
              maxLength={100}
            />
          </div>
        </div>
      </div>

      {error && <p className="form-message error">{error}</p>}

      {createdUrl && (
        <div className="result-panel">
          <span>Your short link</span>
          <a href={createdUrl} target="_blank" rel="noreferrer">
            {createdUrl}
          </a>
          <button type="button" onClick={copyLink}>
            <Copy aria-hidden="true" />
            Copy
          </button>
        </div>
      )}

      <button className="primary-action" type="submit" disabled={loading}>
        {loading ? "Shortening..." : "Shorten link"}
      </button>
    </form>
  );
}

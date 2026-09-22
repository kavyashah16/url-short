import { RefreshCw, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { isValidHttpUrl } from "../urlValidation";
import LinkList from "./LinkList";

const emptyAnalytics = {
  countries: [],
  browsers: [],
  devices: [],
  referrers: [],
  recentClicks: [],
};

const initialEditForm = {
  url: "",
  status: "1",
  clickLimit: "",
  password: "",
  removePassword: false,
};

export default function Dashboard({ user }) {
  const [links, setLinks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLink, setSelectedLink] = useState(null);
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [editingLink, setEditingLink] = useState(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadLinks() {
    setError("");
    setLoading(true);
    try {
      const data = await api.getMyLinks();
      setLinks(data.links || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      await api.deleteLink(id);
      setLinks((current) => current.filter((link) => link.id !== id));
      if (selectedLink?.id === id) {
        closeDetails();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function openDetails(link) {
    setSelectedLink(link);
    setAnalytics(emptyAnalytics);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const data = await api.getLinkDetails(link.short);
      setSelectedLink(data.link || link);
      setAnalytics(data.analytics || emptyAnalytics);
    } catch (err) {
      setDetailsError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetails() {
    setSelectedLink(null);
    setDetailsError("");
    setAnalytics(emptyAnalytics);
  }

  function startEdit(link) {
    setEditingLink(link);
    setEditForm({
      url: link.url || "",
      status: String(link.status ?? 1),
      clickLimit: link.isLimit === 1 && link.clickLimit ? String(link.clickLimit) : "",
      password: "",
      removePassword: false,
    });
    setError("");
    setEditError("");
  }

  function cancelEdit() {
    setEditingLink(null);
    setEditForm(initialEditForm);
    setEditError("");
  }

  function updateEditField(name, value) {
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editingLink) return;

    setError("");
    setEditError("");

    if (!isValidHttpUrl(editForm.url)) {
      setEditError("Please enter a valid http or https URL.");
      return;
    }

    setSavingEdit(true);

    const payload = {
      url: editForm.url.trim(),
      status: Number(editForm.status),
      clickLimit: editForm.clickLimit ? Number(editForm.clickLimit) : "",
    };

    if (editForm.removePassword) {
      payload.password = "";
    } else if (editForm.password.trim()) {
      payload.password = editForm.password.trim();
    }

    try {
      await api.updateLink(editingLink.short, payload);
      setLinks((current) =>
        current.map((link) =>
          link.id === editingLink.id
            ? {
                ...link,
                url: payload.url,
                status: payload.status,
                clickLimit: payload.clickLimit === "" ? null : payload.clickLimit,
                isLimit: payload.clickLimit === "" ? 0 : 1,
                isPass:
                  payload.password === ""
                    ? 0
                    : payload.password
                      ? 1
                      : link.isPass,
              }
            : link,
        ),
      );
      cancelEdit();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  useEffect(() => {
    let active = true;

    api
      .getMyLinks()
      .then((data) => {
        if (active) {
          setLinks(data.links || []);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="dashboard-view">
      <section className="dashboard-header">
        <div>
          <h1>{user.userName}'s links</h1>
        </div>
      </section>

      <section className="dashboard-panel links-panel">
        <div className="panel-bar">
          <div className="section-heading">
            <p className="eyebrow">Manage</p>
            <h2>Your links</h2>
          </div>
          <button
            className="secondary-action refresh-action"
            type="button"
            onClick={loadLinks}
            disabled={loading}
          >
            <RefreshCw aria-hidden="true" />
            Refresh
          </button>
        </div>

        {error && <p className="form-message error">{error}</p>}
        {loading ? (
          <div className="loading-state">Loading links...</div>
        ) : (
          <LinkList
            links={links}
            onDelete={handleDelete}
            onEdit={startEdit}
            onOpenDetails={openDetails}
          />
        )}
      </section>

      {editingLink && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-link-title"
          >
            <button
              className="modal-close"
              type="button"
              aria-label="close edit link"
              onClick={cancelEdit}
            >
              <X aria-hidden="true" />
            </button>

            <div className="modal-heading edit-heading">
              <p>{editingLink.short}</p>
              <h2 id="edit-link-title">Edit link</h2>
            </div>

            <form className="edit-link-form" onSubmit={saveEdit} noValidate>
              <label>
                Destination URL
                <input
                  type="url"
                  value={editForm.url}
                  onChange={(event) => updateEditField("url", event.target.value)}
                  required
                />
              </label>

              {editError && <p className="form-message error edit-form-message">{editError}</p>}

              <label>
                Status
                <select
                  value={editForm.status}
                  onChange={(event) => updateEditField("status", event.target.value)}
                >
                  <option value="1">Active</option>
                  <option value="0">Paused</option>
                </select>
              </label>

              <label className="edit-click-limit-field">
                Click limit
                <input
                  type="number"
                  min="1"
                  placeholder="No limit"
                  value={editForm.clickLimit}
                  onChange={(event) =>
                    updateEditField("clickLimit", event.target.value)
                  }
                />
              </label>

              <div className="password-edit-field">
                <label>
                  Password
                  <input
                    type="text"
                    placeholder={
                      editingLink.isPass === 1
                        ? "Leave blank to keep current password"
                        : "Optional password"
                    }
                    value={editForm.password}
                    disabled={editForm.removePassword}
                    onChange={(event) =>
                      updateEditField("password", event.target.value)
                    }
                  />
                </label>

                {editingLink.isPass === 1 && (
                  <>
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={editForm.removePassword}
                        onChange={(event) =>
                          updateEditField("removePassword", event.target.checked)
                        }
                      />
                      Remove password
                    </label>
                    <span>Leave blank to keep the current password unchanged.</span>
                  </>
                )}
              </div>

              <div className="edit-actions">
                <button
                  className="save-edit-action"
                  type="submit"
                  disabled={savingEdit}
                >
                  <Save aria-hidden="true" />
                  {savingEdit ? "Saving..." : "Save"}
                </button>
                <button
                  className="cancel-edit-action"
                  type="button"
                  onClick={cancelEdit}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedLink && (
        <div className="modal-backdrop analytics-backdrop" role="presentation">
          <section
            className="analytics-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-title"
          >
            <button
              className="modal-close"
              type="button"
              aria-label="close analytics"
              onClick={closeDetails}
            >
              <X aria-hidden="true" />
            </button>

            <div className="modal-heading analytics-heading">
              <p>{selectedLink.short}</p>
              <h2 id="analytics-title">Link analytics</h2>
            </div>

            {detailsError && <p className="form-message error">{detailsError}</p>}

            {detailsLoading ? (
              <div className="loading-state">Loading analytics...</div>
            ) : (
              <LinkAnalytics link={selectedLink} analytics={analytics} />
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function LinkAnalytics({ link, analytics }) {
  const countries = analytics.countries || [];
  const browsers = analytics.browsers || [];
  const devices = analytics.devices || [];
  const referrers = analytics.referrers || [];
  const recentClicks = analytics.recentClicks || [];
  const [clickPageSize, setClickPageSize] = useState(5);
  const [clickPage, setClickPage] = useState(1);
  const totalClickPages = Math.max(1, Math.ceil(recentClicks.length / clickPageSize));
  const safeClickPage = Math.min(clickPage, totalClickPages);
  const clickStart = (safeClickPage - 1) * clickPageSize;
  const visibleClicks = recentClicks.slice(clickStart, clickStart + clickPageSize);

  function changePageSize(value) {
    setClickPageSize(Number(value));
    setClickPage(1);
  }

  return (
    <div className="analytics-content">
      <div className="analytics-summary">
        <Metric label="Clicks" value={link.clickCount ?? 0} />
        <Metric label="Status" value={link.status === 1 ? "Active" : "Paused"} />
        <Metric label="Limit" value={link.isLimit === 1 ? link.clickLimit : "None"} />
        <Metric label="Password" value={link.isPass === 1 ? "Protected" : "Off"} />
      </div>

      {link.isPass === 1 && (
        <div className="password-status-panel">
          <div>
            <span>Password protected</span>
            <strong>Unavailable</strong>
          </div>
          <p>
            This password is stored as a bcrypt hash, so the original value cannot
            be recovered. Replace it from Edit if it needs to change.
          </p>
        </div>
      )}

      <div className="analytics-map" aria-label="click locations map">
        <div className="map-grid" aria-hidden="true" />
        {countries.length === 0 ? (
          <p>No location data yet</p>
        ) : (
          countries.slice(0, 8).map((country, index) => (
            <span
              className="map-pin"
              style={{
                "--x": `${18 + ((index * 23) % 68)}%`,
                "--y": `${24 + ((index * 17) % 52)}%`,
              }}
              key={country.country || index}
              title={`${country.country}: ${country.clicks} clicks`}
            >
              <strong>{country.clicks}</strong>
              {country.country}
            </span>
          ))
        )}
      </div>

      <div className="analytics-grid">
        <AnalyticsList title="Countries" items={countries} labelKey="country" />
        <AnalyticsList title="Browsers" items={browsers} labelKey="browser" />
        <AnalyticsList title="Devices" items={devices} labelKey="device" />
        <AnalyticsList title="Referrers" items={referrers} labelKey="referrer" />
      </div>

      <div className="recent-clicks">
        <div className="recent-clicks-header">
          <h3>Recent clicks</h3>
          <label>
            Rows
            <select
              value={clickPageSize}
              onChange={(event) => changePageSize(event.target.value)}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
          </label>
        </div>
        {recentClicks.length === 0 ? (
          <p>No clicks recorded yet.</p>
        ) : (
          <>
            <div className="click-table">
              {visibleClicks.map((click, index) => (
                <div className="click-row" key={`${click.times}-${clickStart + index}`}>
                  <span>{formatDate(click.times)}</span>
                  <span>{click.country || "Unknown"}</span>
                  <span>{click.browser || "Unknown"}</span>
                  <span>{click.device || "Unknown"}</span>
                  <span>{click.referrer || "Direct"}</span>
                </div>
              ))}
            </div>

            <div className="pagination-controls">
              <button
                className="secondary-action"
                type="button"
                onClick={() => setClickPage((page) => Math.max(1, page - 1))}
                disabled={safeClickPage === 1}
              >
                Previous
              </button>
              <span>
                Page {safeClickPage} of {totalClickPages}
              </span>
              <button
                className="secondary-action"
                type="button"
                onClick={() =>
                  setClickPage((page) => Math.min(totalClickPages, page + 1))
                }
                disabled={safeClickPage === totalClickPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <span>{value}</span>
      <p>{label}</p>
    </div>
  );
}

function AnalyticsList({ title, items, labelKey }) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p>No data yet</p>
      ) : (
        items.slice(0, 5).map((item, index) => (
          <div className="analytics-list-row" key={`${item[labelKey]}-${index}`}>
            <span>{item[labelKey] || "Unknown"}</span>
            <strong>{item.clicks}</strong>
          </div>
        ))
      )}
    </section>
  );
}

function formatDate(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

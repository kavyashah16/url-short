import { RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
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
    });
    setError("");
  }

  function cancelEdit() {
    setEditingLink(null);
    setEditForm(initialEditForm);
  }

  function updateEditField(name, value) {
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editingLink) return;

    setError("");
    setSavingEdit(true);

    const payload = {
      url: editForm.url.trim(),
      status: Number(editForm.status),
      clickLimit: editForm.clickLimit ? Number(editForm.clickLimit) : "",
    };

    if (editForm.password.trim()) {
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
                isPass: payload.password ? 1 : link.isPass,
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
            className="secondary-action"
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
            editingLinkId={editingLink?.id}
            editForm={editForm}
            savingEdit={savingEdit}
            onDelete={handleDelete}
            onEdit={startEdit}
            onOpenDetails={openDetails}
            onCancelEdit={cancelEdit}
            onSaveEdit={saveEdit}
            onEditFieldChange={updateEditField}
          />
        )}
      </section>

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

  return (
    <div className="analytics-content">
      <div className="analytics-summary">
        <Metric label="Clicks" value={link.clickCount ?? 0} />
        <Metric label="Status" value={link.status === 1 ? "Active" : "Paused"} />
        <Metric label="Limit" value={link.isLimit === 1 ? link.clickLimit : "None"} />
        <Metric label="Password" value={link.isPass === 1 ? "On" : "Off"} />
      </div>

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
        <h3>Recent clicks</h3>
        {recentClicks.length === 0 ? (
          <p>No clicks recorded yet.</p>
        ) : (
          <div className="click-table">
            {recentClicks.map((click, index) => (
              <div className="click-row" key={`${click.times}-${index}`}>
                <span>{formatDate(click.times)}</span>
                <span>{click.country || "Unknown"}</span>
                <span>{click.browser || "Unknown"}</span>
                <span>{click.device || "Unknown"}</span>
                <span>{click.referrer || "Direct"}</span>
              </div>
            ))}
          </div>
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

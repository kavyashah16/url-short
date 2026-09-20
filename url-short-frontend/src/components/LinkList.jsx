import { Check, LockKeyhole, MousePointerClick, Pencil, Trash2, X } from "lucide-react";
import { shortUrl } from "../api";

function statusLabel(status) {
  if (status === 1) return "Active";
  if (status === 0) return "Paused";
  return "Deleted";
}

export default function LinkList({
  links,
  editingLinkId,
  editForm,
  savingEdit,
  onDelete,
  onEdit,
  onOpenDetails,
  onCancelEdit,
  onSaveEdit,
  onEditFieldChange,
}) {
  if (!links.length) {
    return (
      <div className="empty-state">
        <LockKeyhole aria-hidden="true" />
        <h3>No saved links yet</h3>
        <p>Create a link while logged in and it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="links-list">
      {links.map((link) => (
        <article
          className="link-row"
          key={link.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpenDetails(link)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenDetails(link);
            }
          }}
        >
          {editingLinkId === link.id ? (
            <form
              className="edit-link-form"
              onSubmit={onSaveEdit}
              onClick={(event) => event.stopPropagation()}
            >
              <label>
                Destination url
                <input
                  type="url"
                  value={editForm.url}
                  onChange={(event) => onEditFieldChange("url", event.target.value)}
                  required
                />
              </label>
              <label>
                Status
                <select
                  value={editForm.status}
                  onChange={(event) =>
                    onEditFieldChange("status", event.target.value)
                  }
                >
                  <option value="1">Active</option>
                  <option value="0">Paused</option>
                </select>
              </label>
              <label>
                Click limit
                <input
                  type="number"
                  min="1"
                  placeholder="No limit"
                  value={editForm.clickLimit}
                  onChange={(event) =>
                    onEditFieldChange("clickLimit", event.target.value)
                  }
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  placeholder={link.isPass === 1 ? "Keep current password" : "Optional"}
                  value={editForm.password}
                  onChange={(event) =>
                    onEditFieldChange("password", event.target.value)
                  }
                />
              </label>
              <div className="link-actions edit-actions">
                <button className="secondary-action" type="submit" disabled={savingEdit}>
                  <Check aria-hidden="true" />
                  Save
                </button>
                <button
                  className="secondary-action"
                  type="button"
                  onClick={onCancelEdit}
                  disabled={savingEdit}
                >
                  <X aria-hidden="true" />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="link-main">
                <a
                  href={shortUrl(link.short)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                >
                  {shortUrl(link.short)}
                </a>
                <span>{link.url}</span>
              </div>

              <div className="link-meta">
                <span>
                  <MousePointerClick aria-hidden="true" />
                  {link.clickCount ?? 0} clicks
                </span>
                <span>{statusLabel(link.status)}</span>
                {link.isPass === 1 && (
                  <span>
                    <LockKeyhole aria-hidden="true" />
                    Password
                  </span>
                )}
                {link.isLimit === 1 && <span>Limit {link.clickLimit}</span>}
              </div>

              <div className="link-actions">
                <button
                  className="secondary-action icon-action"
                  type="button"
                  aria-label={`edit ${link.short}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(link);
                  }}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </button>
                <button
                  className="danger-action icon-action"
                  type="button"
                  aria-label={`delete ${link.short}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(link.id);
                  }}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </button>
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}

import {
  BarChart3,
  LockKeyhole,
  MousePointerClick,
  Pencil,
  Trash2,
} from "lucide-react";
import { shortUrl } from "../api";

function statusLabel(status) {
  if (status === 1) return "Active";
  if (status === 0) return "Paused";
  return "Deleted";
}

export default function LinkList({
  links,
  onDelete,
  onEdit,
  onOpenDetails,
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
        <article className="link-row" key={link.id}>
          <div className="link-main">
            <a href={shortUrl(link.short)} target="_blank" rel="noreferrer">
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
              className="secondary-action icon-action analytics-action"
              type="button"
              aria-label={`open analytics for ${link.short}`}
              onClick={() => onOpenDetails(link)}
            >
              <BarChart3 aria-hidden="true" />
              Analytics
            </button>
            <button
              className="secondary-action icon-action edit-action"
              type="button"
              aria-label={`edit ${link.short}`}
              onClick={() => onEdit(link)}
            >
              <Pencil aria-hidden="true" />
              Edit
            </button>
            <button
              className="danger-action icon-action"
              type="button"
              aria-label={`delete ${link.short}`}
              onClick={() => onDelete(link.id)}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

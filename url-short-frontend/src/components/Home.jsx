import { Link2, MousePointerClick } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import CreateLinkForm from "./CreateLinkForm";

const defaultStats = {
  totalLinks: 0,
  totalClicks: 0,
};

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(value || 0);
}

export default function Home() {
  const [stats, setStats] = useState(defaultStats);

  async function loadStats() {
    try {
      const data = await api.getStats();
      setStats({
        totalLinks: data.totalLinks || 0,
        totalClicks: data.totalClicks || 0,
      });
    } catch {
      setStats(defaultStats);
    }
  }

  useEffect(() => {
    let active = true;

    api
      .getStats()
      .then((data) => {
        if (active) {
          setStats({
            totalLinks: data.totalLinks || 0,
            totalClicks: data.totalClicks || 0,
          });
        }
      })
      .catch(() => {
        if (active) {
          setStats(defaultStats);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="home-view">
      <section className="hero-section">
        <div className="hero-copy">
          <h1 className="hero-words">
            <span>Short</span>
            <span>Share</span>
            <span>Fast</span>
            <span>Track</span>
          </h1>
          <p className="hero-subcopy">
            Create cleaner links, share them faster, and track every click.
          </p>

          <div className="public-stats" aria-label="platform statistics">
            <div>
              <p className="stat-label">
                <Link2 aria-hidden="true" />
                Total links created
              </p>
              <span>{formatNumber(stats.totalLinks)}</span>
            </div>
            <div>
              <p className="stat-label">
                <MousePointerClick aria-hidden="true" />
                Total clicks so far
              </p>
              <span>{formatNumber(stats.totalClicks)}</span>
            </div>
          </div>
        </div>

        <div className="hero-tool">
          <CreateLinkForm onCreated={loadStats} />
        </div>
      </section>
    </main>
  );
}

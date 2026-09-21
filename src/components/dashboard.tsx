'use client';
import Link from 'next/link';
import { ArrowRight, ChartNoAxesCombined, HardDrive, ShieldCheck } from 'lucide-react';
import { useDownloads } from '@/hooks/use-downloads';
import { StatCards } from './stat-cards';
export function Dashboard() {
  const { stats, error } = useDownloads('history');
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span /> THE BIGGER PICTURE
          </div>
          <h1>
            Your media. <span>By the numbers.</span>
          </h1>
          <p>A little perspective on everything you’ve collected.</p>
        </div>
        <span className="heading-decoration">
          <ChartNoAxesCombined size={34} strokeWidth={1.2} />
        </span>
      </div>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="section-heading">
        <h2>Workspace overview</h2>
        <span className="section-aside">ALL TIME · COMPLETED TRANSFERS</span>
      </div>
      <StatCards stats={stats} expanded />
      <div className="overview-grid">
        <section className="overview-card">
          <HardDrive size={23} />
          <h2>Local by design.</h2>
          <p>
            Your queue and download history live in this workspace’s SQLite database. Refresh, come
            back later, and pick up where you left off.
          </p>
          <Link className="text-link" href="/history">
            Explore your collection <ArrowRight size={15} />
          </Link>
        </section>
        <section className="overview-card">
          <ShieldCheck size={23} />
          <h2>A thoughtful starting point.</h2>
          <p>
            All providers currently use simulated media. No external content is fetched, no
            restrictions are bypassed, and no media files are saved.
          </p>
          <Link className="text-link" href="/">
            Try a demo download <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </div>
  );
}

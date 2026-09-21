'use client';
import Link from 'next/link';
import { Modal } from './modal';
import { usePathname } from 'next/navigation';
import {
  ArrowDownToLine,
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  History,
  Layers3,
  Link2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [help, setHelp] = useState(false);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="The Chain home">
          <span className="brand-icon">
            <Link2 size={25} strokeWidth={2.5} />
          </span>
          <span>
            THE CHAIN<span className="brand-version">MEDIA, UNLINKED.</span>
          </span>
        </Link>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {[
            { href: '/', label: 'Downloader', icon: ArrowDownToLine },
            { href: '/history', label: 'Download history', icon: History },
            { href: '/dashboard', label: 'Overview', icon: ChartNoAxesCombined },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              className={`nav-link ${path === href ? 'active' : ''}`}
              aria-current={path === href ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {path === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <div className="local-icon">
              <Layers3 size={19} />
            </div>
            <strong>Your media. Your space.</strong>
            <p>
              One place for everything
              <br />
              you want to keep.
            </p>
            <span>
              <span className="status-dot" /> Local workspace
            </span>
          </div>
          <button className="help-button" onClick={() => setHelp(true)}>
            <CircleHelp size={17} /> Help & information <ArrowUpRight size={15} />
          </button>
          <div className="sidebar-footer">
            <span className="mini-chain">
              <Link2 size={14} /> THE CHAIN
            </span>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <span>
              {path === '/history'
                ? 'Download history'
                : path === '/dashboard'
                  ? 'Overview'
                  : 'Downloader'}
            </span>
          </div>
          <div className="topbar-right">
            <span className="demo-badge">
              <span /> Demo mode
            </span>
            <span className="avatar">TC</span>
          </div>
        </header>
        <main>{children}</main>
        <footer className="page-footer">
          <span>
            <ShieldCheck size={14} /> Built for the open web. Respect the creators.
          </span>
          <span>
            Made to keep things simple. <Link2 size={15} />
          </span>
        </footer>
      </div>
      {help && (
        <Modal labelledBy="help-title" onClose={() => setHelp(false)}>
          <button
            autoFocus
            className="icon-button modal-close"
            aria-label="Close help"
            onClick={() => setHelp(false)}
          >
            <X size={20} />
          </button>
          <span className="eyebrow">A LITTLE CONTEXT</span>
          <h2 id="help-title">Welcome to The Chain.</h2>
          <p>
            Paste an HTTP or HTTPS media URL, analyze it, pick a format, and add it to your queue.
          </p>
          <p>
            This MVP uses demo metadata and simulated transfers for every provider. It does not
            fetch external media or create downloadable files. Sizes and formats are illustrative.
          </p>
          <p>
            Try “Test retry” to simulate a failed transfer, then retry it. Completed demos appear in
            history and contribute to your overview.
          </p>
          <button className="primary-button" onClick={() => setHelp(false)}>
            Got it <ArrowUpRight size={16} />
          </button>
        </Modal>
      )}
    </div>
  );
}

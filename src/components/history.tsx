'use client';
import { useEffect, useState } from 'react';
import { Search, Trash2, History as HistoryIcon, X } from 'lucide-react';
import { useDownloads } from '@/hooks/use-downloads';
import { api } from '@/lib/client';
import { DownloadList } from './download-list';
import { Skeleton, Toast } from './ui';
import { Modal } from './modal';
export function History() {
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('all');
  const [type, setType] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const { items, stats, loading, error, refresh } = useDownloads('history', search, provider, type);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function remove(id?: string) {
    setBusy(id ?? 'all');
    try {
      await api(`/api/downloads${id ? `/${id}` : ''}`, { method: 'DELETE' });
      await refresh();
      setConfirm(false);
      setToast({ text: id ? 'Record deleted.' : 'Download history cleared.' });
    } catch (e) {
      setToast({ text: (e as Error).message, error: true });
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span /> YOUR PERSONAL COLLECTION
          </div>
          <h1>
            Good things. <span>Kept together.</span>
          </h1>
          <p>A home for every completed download. Find your favorites in a few clicks.</p>
        </div>
        <span className="heading-decoration">
          <HistoryIcon size={34} strokeWidth={1.2} />
        </span>
      </div>
      <div className="section-heading">
        <h2>
          Download history <span className="count-badge">{stats?.total ?? 0}</span>
        </h2>
        <button
          className="secondary-button danger"
          disabled={!stats?.total || busy !== null}
          onClick={() => setConfirm(true)}
        >
          <Trash2 size={15} /> Clear history
        </button>
      </div>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search downloads"
            placeholder="Search your downloads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter by platform"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="all">All platforms</option>
          {['YouTube', 'Instagram', 'TikTok', 'Generic'].map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <select
          aria-label="Filter by media type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All media types</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="image">Images</option>
        </select>
      </div>
      <div className="queue-panel">
        <div className="queue-toolbar">
          <span>
            {items.length} matching {items.length === 1 ? 'download' : 'downloads'}
          </span>
          <span>COMPLETED DEMO TRANSFERS</span>
        </div>
        {error && (
          <p role="alert" className="error-banner">
            {error}
          </p>
        )}
        {loading ? (
          <Skeleton />
        ) : (
          <DownloadList
            history
            items={items}
            busy={busy}
            onAction={(id) => {
              void remove(id);
            }}
          />
        )}
      </div>
      <p className="page-note">
        History and statistics are stored locally in SQLite. Demo transfers don’t create media
        files.
      </p>
      <Toast message={toast} onClose={() => setToast(null)} />
      {confirm && (
        <Modal labelledBy="clear-title" locked={!!busy} onClose={() => setConfirm(false)}>
          <button
            autoFocus
            disabled={!!busy}
            className="icon-button modal-close"
            aria-label="Cancel clear history"
            onClick={() => setConfirm(false)}
          >
            <X size={18} />
          </button>
          <h2 id="clear-title">Clear your history?</h2>
          <p>
            This permanently removes all completed demo records and resets your statistics. Active
            queue items stay in place.
          </p>
          <div className="modal-actions">
            <button
              disabled={!!busy}
              className="secondary-button"
              onClick={() => setConfirm(false)}
            >
              Keep history
            </button>
            <button
              disabled={!!busy}
              className="primary-button"
              onClick={() => {
                void remove();
              }}
            >
              {busy ? 'Clearing…' : 'Clear history'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

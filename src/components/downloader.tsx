'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  ChevronRight,
  Clipboard,
  Info,
  Link2,
  ListVideo,
  LoaderCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { api, bytes } from '@/lib/client';
import { detectProvider, urlSchema } from '@/lib/url';
import { examples } from '@/providers/demo';
import type { Media } from '@/types/media';
import { useDownloads } from '@/hooks/use-downloads';
import { StatCards } from './stat-cards';
import { MediaArt } from './media-art';
import { MediaPreview } from './media-preview';
import { DownloadList } from './download-list';
import { Platform, Skeleton, Toast } from './ui';
export function Downloader() {
  const [url, setUrl] = useState('');
  const [media, setMedia] = useState<Media | null>(null);
  const [format, setFormat] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [inputError, setInputError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const { items, stats, loading, error, refresh } = useDownloads('queue');
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function analyze(value = url) {
    const parsed = urlSchema.safeParse(value);
    if (!parsed.success) {
      setInputError(parsed.error.issues[0].message);
      input.current?.focus();
      return;
    }
    setInputError('');
    setAnalyzing(true);
    setMedia(null);
    setUrl(value);
    try {
      const result = await api<Media>('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: parsed.data }),
      });
      setMedia(result);
      setFormat(result.formats[0].id);
    } catch (e) {
      setToast({ text: (e as Error).message, error: true });
    } finally {
      setAnalyzing(false);
    }
  }
  async function download() {
    if (!media) return;
    setAdding(true);
    try {
      await api('/api/download', {
        method: 'POST',
        body: JSON.stringify({ url: media.url, formatId: format }),
      });
      setToast({
        text: media.demo
          ? 'Added to your queue. Your demo is on its way.'
          : 'Added to your queue. Download started.',
      });
      await refresh();
    } catch (e) {
      setToast({ text: (e as Error).message, error: true });
    } finally {
      setAdding(false);
    }
  }
  async function action(id: string, action: 'pause' | 'resume' | 'retry' | 'remove') {
    setBusy(id);
    try {
      await api(`/api/downloads/${id}`, {
        method: action === 'remove' ? 'DELETE' : 'PATCH',
        ...(action === 'remove' ? {} : { body: JSON.stringify({ action }) }),
      });
      await refresh();
      setToast({
        text:
          action === 'remove'
            ? 'Download removed.'
            : action === 'pause'
              ? 'Download paused.'
              : action === 'resume'
                ? 'Download resumed.'
                : 'Trying that download again.',
      });
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
            <span /> LESS FRICTION. MORE COLLECTION.
          </div>
          <h1>
            One link. <span>Every format.</span>
          </h1>
          <p>Your favorite media, all connected. Drop a link and take it from here.</p>
        </div>
        <span className="heading-decoration">
          <Link2 size={38} strokeWidth={1.2} />
        </span>
      </div>
      <section className="analyzer-panel">
        <div className="panel-label">
          <span>
            <Link2 size={16} /> START WITH A LINK
          </span>
          <span className="quiet-label">
            <Zap size={13} /> Simple. Fast. Yours.
          </span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void analyze();
          }}
        >
          <div className={`url-input-wrap ${inputError ? 'invalid' : ''}`}>
            <Link2 size={20} />
            <input
              ref={input}
              aria-label="Media URL"
              aria-describedby={inputError ? 'url-error' : 'demo-description'}
              aria-invalid={!!inputError}
              type="text"
              inputMode="url"
              placeholder="Paste a media URL..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setInputError('');
              }}
              disabled={analyzing}
            />
            <button
              type="button"
              className="paste-button"
              aria-label="Paste URL from clipboard"
              onClick={async () => {
                try {
                  setUrl(await navigator.clipboard.readText());
                  input.current?.focus();
                } catch {
                  setToast({
                    text: 'Clipboard unavailable. Paste with Ctrl+V or ⌘V.',
                    error: true,
                  });
                }
              }}
            >
              <Clipboard size={15} />
              <span>Paste</span>
            </button>
          </div>
          <button className="primary-button analyze-button" disabled={analyzing || !url.trim()}>
            {analyzing ? <LoaderCircle className="spin" size={17} /> : null}
            {analyzing ? 'Analyzing' : 'Analyze link'}
            <ArrowRight size={17} />
          </button>
        </form>
        {inputError && (
          <p className="input-error" id="url-error">
            {inputError}
          </p>
        )}
        <div className="provider-row">
          <span>Works with</span>
          <Platform name="YouTube" />
          <Platform name="Instagram" />
          <Platform name="TikTok" />
          <span className="provider-separator" />
          <Platform name="Generic" />
          {urlSchema.safeParse(url).success && (
            <span className="detected">
              <CheckCheck size={14} /> {detectProvider(url)} detected
            </span>
          )}
        </div>
        <div className="demo-note" id="demo-description">
          <Info size={15} />
          <p>Public YouTube videos and direct media-file links download for real.</p>
          <button
            type="button"
            className="demo-sample"
            disabled={analyzing}
            onClick={() =>
              void analyze(
                'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
              )
            }
          >
            Try a real CC0 MP4 <ArrowUpRight size={12} />
          </button>
        </div>
      </section>
      {analyzing && <Skeleton />}
      {media && (
        <MediaPreview
          media={media}
          selected={format}
          setSelected={setFormat}
          busy={adding}
          onDownload={download}
          onClose={() => setMedia(null)}
        />
      )}
      <section className="examples-section">
        <div className="section-heading">
          <h2>
            A little inspiration <span>Try a sample link</span>
          </h2>
          <span className="section-aside">
            <Sparkles size={13} /> READY TO EXPLORE
          </span>
        </div>
        <div className="example-grid">
          {examples.map((item, index) => (
            <button
              key={item.url}
              className="example-card"
              disabled={analyzing}
              onClick={() => {
                void analyze(item.url);
              }}
            >
              <MediaArt kind={item.art} className="example-art" play={item.type === 'video'} />
              <div className="example-copy">
                <span className="example-kicker">
                  0{index + 1} <span>/</span> {item.type.toUpperCase()}
                </span>
                <strong>
                  {item.label}
                  <ArrowUpRight size={15} />
                </strong>
                <p>{item.caption}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="queue-section">
        <div className="section-heading">
          <h2>
            <ListVideo size={19} /> Download queue{' '}
            <span className="count-badge">{items.length}</span>
          </h2>
          <Link href="/history" className="text-link">
            View history <ChevronRight size={15} />
          </Link>
        </div>
        <div className="queue-panel">
          <div className="queue-toolbar">
            <span>
              <span
                className={`status-dot ${items.some((item) => !item.paused && item.status !== 'failed') ? '' : 'muted'}`}
              />
              {items.some((item) => !item.paused && item.status !== 'failed')
                ? 'Transfers in progress'
                : 'Ready when you are'}
            </span>
            <span>LOCAL WORKSPACE</span>
          </div>
          {error && (
            <p role="alert" className="error-banner">
              {error}
            </p>
          )}
          {loading ? <Skeleton /> : <DownloadList items={items} busy={busy} onAction={action} />}
        </div>
      </section>
      <section className="activity-section">
        <div className="section-heading">
          <h2>Your collection, at a glance</h2>
          <span className="section-aside">
            {stats ? bytes(stats.bytes) : '—'} transferred <span className="meta-dot">·</span> All
            time
          </span>
        </div>
        <StatCards stats={stats} />
      </section>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}

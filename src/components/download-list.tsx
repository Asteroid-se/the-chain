'use client';
import {
  ArrowDownToLine,
  Check,
  Inbox,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  AlertCircle,
  LoaderCircle,
  Download,
} from 'lucide-react';
import type { DownloadItem } from '@/types/media';
import { bytes } from '@/lib/client';
import { MediaArt } from './media-art';
import { Platform } from './ui';
export function DownloadList({
  items,
  busy,
  onAction,
  history = false,
}: {
  items: DownloadItem[];
  busy: string | null;
  onAction: (id: string, action: 'pause' | 'resume' | 'retry' | 'remove') => void;
  history?: boolean;
}) {
  if (!items.length)
    return (
      <div className="empty-state">
        <span className="empty-icon">
          {history ? <Inbox size={25} /> : <ArrowDownToLine size={25} />}
        </span>
        <h3>{history ? 'Nothing here just yet' : 'Your next favorite starts with a link'}</h3>
        <p>
          {history
            ? 'Completed demos appear here. Try a download or adjust your filters.'
            : 'Analyze a link above and add your media to the queue.'}
        </p>
        <span className="empty-caption">
          {history
            ? 'A little less searching. A little more saving.'
            : 'VIDEO, AUDIO, IMAGES. ALL IN ONE PLACE.'}
        </span>
      </div>
    );
  return (
    <div className="download-list">
      {items.map((item) => (
        <article className="download-row" key={item.id}>
          <MediaArt kind={item.thumbnail} className="queue-art" />
          <div className="download-detail">
            <h3>{item.title}</h3>
            <div className="download-meta">
              <Platform name={item.provider} />
              <span className="meta-dot">·</span>
              <span>
                {item.format.toUpperCase()} · {item.quality}
              </span>
              <span className="meta-dot">·</span>
              <span>{bytes(item.fileSize)}</span>
            </div>
            {!history && (
              <>
                <div className={`progress-track ${item.status === 'failed' ? 'failed' : ''}`}>
                  <div style={{ width: `${item.progress}%` }} />
                </div>
                {item.error && <p className="job-error">{item.error}</p>}
              </>
            )}
          </div>
          <div className="job-status">
            {history ? (
              <>
                <span className="complete-label">
                  <Check size={14} /> Completed
                </span>
                <small>{new Date(item.completedAt ?? item.createdAt).toLocaleDateString()}</small>
              </>
            ) : (
              <>
                <span className={item.status === 'failed' ? 'failed-label' : ''}>
                  {item.paused ? (
                    'Paused'
                  ) : item.status === 'failed' ? (
                    <>
                      <AlertCircle size={13} /> Failed
                    </>
                  ) : item.status === 'queued' ? (
                    'Queued'
                  ) : (
                    'Downloading'
                  )}
                </span>
                <small>{item.progress}%</small>
              </>
            )}
          </div>
          <div className="row-actions">
            {busy === item.id ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <>
                {history && item.hasFile && (
                  <a
                    className="icon-button"
                    href={`/api/downloads/${item.id}/file`}
                    aria-label="Save downloaded file"
                    title="Save downloaded file"
                  >
                    <Download size={17} />
                  </a>
                )}
                {item.status === 'failed' && (
                  <button
                    className="icon-button"
                    title="Retry download"
                    aria-label="Retry download"
                    onClick={() => onAction(item.id, 'retry')}
                  >
                    <RotateCcw size={17} />
                  </button>
                )}
                {['queued', 'processing'].includes(item.status) && (
                  <button
                    className="icon-button"
                    title={item.paused ? 'Resume download' : 'Pause download'}
                    aria-label={item.paused ? 'Resume download' : 'Pause download'}
                    onClick={() => onAction(item.id, item.paused ? 'resume' : 'pause')}
                  >
                    {item.paused ? <Play size={17} /> : <Pause size={17} />}
                  </button>
                )}
                <button
                  className="icon-button danger"
                  aria-label={history ? 'Delete record' : 'Remove download'}
                  title={history ? 'Delete record' : 'Remove download'}
                  onClick={() => onAction(item.id, 'remove')}
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

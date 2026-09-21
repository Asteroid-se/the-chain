'use client';
import { ArrowDownToLine, Clock3, LoaderCircle, X } from 'lucide-react';
import type { Media } from '@/types/media';
import { bytes } from '@/lib/client';
import { MediaArt } from './media-art';
import { Platform } from './ui';
export function MediaPreview({
  media,
  selected,
  setSelected,
  busy,
  onDownload,
  onClose,
}: {
  media: Media;
  selected: string;
  setSelected: (value: string) => void;
  busy: boolean;
  onDownload: () => void;
  onClose: () => void;
}) {
  return (
    <section className="media-preview">
      <MediaArt kind={media.thumbnail} className="preview-art" play />
      <div className="preview-content">
        <div className="preview-top">
          <Platform name={media.provider} />
          <span className="tiny-badge">DEMO PREVIEW</span>
          <button className="icon-button" aria-label="Close preview" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        <h3>{media.title}</h3>
        <p>
          {media.author}
          {media.duration && (
            <span>
              <Clock3 size={12} /> {media.duration}
            </span>
          )}
        </p>
        <div className="format-controls">
          <label>
            Download format
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {media.formats.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.label} · {format.quality} · {bytes(format.fileSize)}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" onClick={onDownload} disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <ArrowDownToLine size={16} />} Add
            to queue
          </button>
        </div>
      </div>
    </section>
  );
}

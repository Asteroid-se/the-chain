import { AudioLines, Play } from 'lucide-react';
export function MediaArt({
  kind = 'landscape',
  className = '',
  play = false,
}: {
  kind?: string;
  className?: string;
  play?: boolean;
}) {
  return (
    <div aria-hidden="true" className={`media-art art-${kind} ${className}`}>
      <div className="art-glow" />
      <div className="art-sun" />
      <div className="mountain mountain-back" />
      <div className="mountain mountain-front" />
      <div className="art-grain" />
      {kind === 'audio' && <AudioLines className="audio-art-icon" size={68} strokeWidth={1} />}
      {kind === 'motion' && <div className="motion-rings" />}
      {play && (
        <span className="art-play">
          <Play size={17} fill="currentColor" />
        </span>
      )}
    </div>
  );
}

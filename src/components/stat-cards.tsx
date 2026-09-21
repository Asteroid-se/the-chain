import {
  ArrowDownToLine,
  Clapperboard,
  Headphones,
  ImageIcon,
  HardDrive,
  Trophy,
  ArrowUpRight,
} from 'lucide-react';
import type { Stats } from '@/types/media';
import { bytes } from '@/lib/client';
export function StatCards({
  stats,
  expanded = false,
}: {
  stats: Stats | null;
  expanded?: boolean;
}) {
  const cards = [
    {
      title: 'Total downloads',
      value: stats?.total,
      icon: ArrowDownToLine,
      note: 'All your saved media',
    },
    { title: 'Videos', value: stats?.videos, icon: Clapperboard, note: 'Every frame, kept' },
    {
      title: 'Audio downloads',
      value: stats?.audio,
      icon: Headphones,
      note: 'Your sounds, collected',
    },
    { title: 'Images', value: stats?.images, icon: ImageIcon, note: 'Moments worth keeping' },
    ...(expanded
      ? [
          {
            title: 'Downloaded data',
            value: stats ? bytes(stats.bytes) : undefined,
            icon: HardDrive,
            note: 'Simulated transfer size',
          },
          {
            title: 'Most used platform',
            value: stats?.platform,
            icon: Trophy,
            note: 'Your favorite source',
          },
        ]
      : []),
  ];
  return (
    <div className={`stats-grid ${expanded ? 'expanded' : ''}`}>
      {cards.map(({ title, value, icon: Icon, note }) => (
        <div className="stat-card" key={title}>
          <div className="stat-top">
            <span>{title}</span>
            <Icon size={16} />
          </div>
          <strong>{value ?? '—'}</strong>
          <div className="stat-note">
            {note}
            <ArrowUpRight size={13} />
          </div>
        </div>
      ))}
    </div>
  );
}

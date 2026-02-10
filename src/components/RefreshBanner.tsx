import { RefreshCw } from 'lucide-react';

interface RefreshBannerProps {
  visible: boolean;
  onRefresh: () => void;
}

export function RefreshBanner({ visible, onRefresh }: RefreshBannerProps) {
  if (!visible) return null;

  return (
    <div className="refresh-banner">
      <div className="refresh-banner__content">
        <RefreshCw className="h-4 w-4 refresh-banner__icon" />
        <span>A collaborator made changes.</span>
        <button className="refresh-banner__btn" onClick={onRefresh}>
          Refresh
        </button>
      </div>
    </div>
  );
}

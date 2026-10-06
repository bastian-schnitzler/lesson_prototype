import type { ReactNode } from 'react';

import { useI18n } from '../app/context.tsx';

export function StatusMessage({ kind = 'info', children, onRetry }: { kind?: 'info' | 'error'; children: ReactNode; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className={`status status-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <div>{children}</div>
      {onRetry && (
        <button type="button" className="button button-outline button-small" onClick={onRetry}>
          {t('action.retry')}
        </button>
      )}
    </div>
  );
}

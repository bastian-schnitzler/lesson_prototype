import { useI18n } from '../app/context.tsx';
import type { NotReadyReason } from '../domain/courses.ts';

export function ReasonList({ reasons }: { reasons: NotReadyReason[] }) {
  const { t } = useI18n();
  return (
    <ul className="reasons">
      {reasons.map((r) => (
        <li key={r}>{t(`reason.${r}`)}</li>
      ))}
    </ul>
  );
}

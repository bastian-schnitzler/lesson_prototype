import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { useI18n } from '../app/context.tsx';
import { childEntries, isContainer, visibleNodes, type JsonPath, type VisibleNode } from '../domain/jsonTree.ts';

interface JsonTreeProps {
  value: unknown;
  rootLabel: string;
  /** Expansion overrides owned by the page, so they survive mode and locale switches. */
  overrides: ReadonlyMap<JsonPath, boolean>;
  onOverridesChange: (next: ReadonlyMap<JsonPath, boolean>) => void;
}

function primitiveText(value: unknown): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

function primitiveType(value: unknown): string {
  return value === null ? 'null' : typeof value;
}

/** Read-only, keyboard-operable JSON tree (WAI-ARIA tree pattern). */
export function JsonTree({ value, rootLabel, overrides, onOverridesChange }: JsonTreeProps) {
  const { t } = useI18n();
  const nodes = useMemo(() => visibleNodes(value, overrides), [value, overrides]);
  const [focused, setFocused] = useState<JsonPath>('');
  const refs = useRef(new Map<JsonPath, HTMLLIElement>());
  const shouldFocus = useRef(false);

  const sizes = useMemo(() => {
    const info = new Map<JsonPath, { setsize: number; posinset: number }>();
    const counts = new Map<JsonPath | null, number>();
    for (const n of nodes) counts.set(n.parent, (counts.get(n.parent) ?? 0) + 1);
    const seen = new Map<JsonPath | null, number>();
    for (const n of nodes) {
      const pos = (seen.get(n.parent) ?? 0) + 1;
      seen.set(n.parent, pos);
      info.set(n.path, { setsize: counts.get(n.parent) ?? 1, posinset: pos });
    }
    return info;
  }, [nodes]);

  const focusIndex = Math.max(0, nodes.findIndex((n) => n.path === focused));

  useEffect(() => {
    if (shouldFocus.current) {
      refs.current.get(nodes[focusIndex]?.path ?? '')?.focus();
      shouldFocus.current = false;
    }
  }, [focusIndex, nodes]);

  const setExpanded = (node: VisibleNode, expanded: boolean) => {
    const next = new Map(overrides);
    next.set(node.path, expanded);
    onOverridesChange(next);
  };

  const moveTo = (index: number) => {
    const node = nodes[Math.min(nodes.length - 1, Math.max(0, index))];
    if (!node) return;
    shouldFocus.current = true;
    setFocused(node.path);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>, node: VisibleNode, index: number) => {
    const container = isContainer(node.value) && childEntries(node.value).length > 0;
    const expanded = container && node.expanded;
    let handled = true;
    switch (e.key) {
      case 'ArrowDown':
        moveTo(index + 1);
        break;
      case 'ArrowUp':
        moveTo(index - 1);
        break;
      case 'Home':
        moveTo(0);
        break;
      case 'End':
        moveTo(nodes.length - 1);
        break;
      case 'ArrowRight':
        if (container && !expanded) setExpanded(node, true);
        else if (expanded) moveTo(index + 1);
        break;
      case 'ArrowLeft':
        if (expanded) setExpanded(node, false);
        else if (node.parent !== null) moveTo(nodes.findIndex((n) => n.path === node.parent));
        break;
      case 'Enter':
      case ' ':
        if (container) setExpanded(node, !expanded);
        break;
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="json-tree">
      <ul role="tree" aria-label={rootLabel}>
        {nodes.map((node, index) => {
          const container = isContainer(node.value);
          const count = container ? childEntries(node.value).length : 0;
          const expandable = container && count > 0;
          const expanded = expandable && node.expanded;
          const { setsize, posinset } = sizes.get(node.path) ?? { setsize: 1, posinset: 1 };
          const summary = container
            ? Array.isArray(node.value)
              ? count === 1
                ? t('raw.arraySummaryOne')
                : t('raw.arraySummary', { count })
              : count === 1
                ? t('raw.objectSummaryOne')
                : t('raw.objectSummary', { count })
            : '';
          const keyLabel = node.key === null ? rootLabel : node.key;
          const label = !container
            ? `${keyLabel}: ${primitiveText(node.value)}`
            : count === 0
              ? `${keyLabel}: ${Array.isArray(node.value) ? '[]' : '{}'}`
              : `${keyLabel} (${summary})`;
          return (
            <li
              key={node.path}
              ref={(el) => {
                if (el) refs.current.set(node.path, el);
                else refs.current.delete(node.path);
              }}
              role="treeitem"
              aria-label={label}
              aria-level={node.depth + 1}
              aria-setsize={setsize}
              aria-posinset={posinset}
              aria-expanded={expandable ? expanded : undefined}
              tabIndex={index === focusIndex ? 0 : -1}
              className={`tree-row${expandable ? ' is-container' : ''}`}
              style={{ paddingInlineStart: `${node.depth * 1.25 + 0.25}rem` }}
              onKeyDown={(e) => onKeyDown(e, node, index)}
              onFocus={() => setFocused(node.path)}
              onClick={(e) => {
                e.stopPropagation();
                setFocused(node.path);
                if (expandable) setExpanded(node, !expanded);
              }}
            >
              <span className="tree-toggle" aria-hidden="true">
                {expandable ? (expanded ? '▾' : '▸') : ''}
              </span>
              <span className="tree-key">{keyLabel}</span>
              {container ? (
                <span className="tree-summary">
                  {count === 0 ? (Array.isArray(node.value) ? ' []' : ' {}') : ` (${summary})`}
                </span>
              ) : (
                <>
                  <span className="tree-colon">: </span>
                  <span className={`tree-value tree-${primitiveType(node.value)}`}>{primitiveText(node.value)}</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

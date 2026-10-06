/**
 * Expansion rules for the raw JSON tree (SPEC section 3, D36): the root is
 * expanded; primitives are leaves; arrays/objects with 0–3 immediate children
 * start expanded and larger ones collapsed, except that an only child is
 * always expanded. The rule is evaluated per node when its parent is first
 * shown, never by counting descendants. User toggles override the default for
 * a path.
 */

export const MAX_EXPANDED_CHILDREN = 3;

export type JsonPath = string;

export function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === 'object';
}

export function childEntries(value: unknown): [string, unknown][] {
  if (Array.isArray(value)) return value.map((v, i) => [String(i), v]);
  if (isContainer(value)) return Object.entries(value);
  return [];
}

export function childPath(parent: JsonPath, key: string): JsonPath {
  return `${parent}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`;
}

export const ROOT_PATH: JsonPath = '';

/** `alwaysOpen` holds for the root and for the only child of its parent. */
export function defaultExpanded(value: unknown, alwaysOpen: boolean): boolean {
  if (!isContainer(value)) return false;
  return alwaysOpen || childEntries(value).length <= MAX_EXPANDED_CHILDREN;
}

export interface VisibleNode {
  path: JsonPath;
  key: string | null;
  value: unknown;
  depth: number;
  parent: JsonPath | null;
  /** Current state, after applying the default rule and user overrides. */
  expanded: boolean;
}

/** Nodes currently shown, in display order. */
export function visibleNodes(root: unknown, overrides: ReadonlyMap<JsonPath, boolean>): VisibleNode[] {
  const out: VisibleNode[] = [];
  const walk = (value: unknown, path: JsonPath, key: string | null, depth: number, parent: JsonPath | null, alwaysOpen: boolean) => {
    const expanded = isContainer(value) && (overrides.get(path) ?? defaultExpanded(value, alwaysOpen));
    out.push({ path, key, value, depth, parent, expanded });
    if (expanded) {
      const children = childEntries(value);
      for (const [k, v] of children) walk(v, childPath(path, k), k, depth + 1, path, children.length === 1);
    }
  };
  walk(root, ROOT_PATH, null, 0, null, true);
  return out;
}

import { useEffect, useState } from 'react';

/** Hash routes keep a refreshed URL on index.html, which GitHub Pages requires. */
export type Route =
  | { name: 'index' }
  | { name: 'lesson'; id: string }
  | { name: 'play'; id: string }
  | { name: 'notFound'; hash: string };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/') return { name: 'index' };
  const m = /^\/lesson\/([a-z0-9-]+)(\/play)?$/.exec(path);
  if (m) return m[2] ? { name: 'play', id: m[1] } : { name: 'lesson', id: m[1] };
  return { name: 'notFound', hash };
}

export const href = {
  index: () => '#/',
  lesson: (id: string) => `#/lesson/${id}`,
  play: (id: string) => `#/lesson/${id}/play`,
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo?.(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

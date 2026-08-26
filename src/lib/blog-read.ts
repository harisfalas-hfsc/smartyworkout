import { useCallback, useEffect, useState } from "react";

const KEY = "smarty-blog-read-slugs";

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function save(slugs: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event("smarty-blog-read-change"));
}

export function markArticleRead(slug: string, read = true) {
  if (typeof window === "undefined") return;
  const current = new Set(load());
  if (read) current.add(slug);
  else current.delete(slug);
  save(Array.from(current));
}

/** Read/unread state for blog articles, stored on the device. */
export function useBlogReadState() {
  const [readSlugs, setReadSlugs] = useState<Set<string>>(() => new Set<string>());

  useEffect(() => {
    const sync = () => setReadSlugs(new Set(load()));
    sync();
    window.addEventListener("smarty-blog-read-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("smarty-blog-read-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isRead = useCallback((slug: string) => readSlugs.has(slug), [readSlugs]);
  const toggleRead = useCallback(
    (slug: string) => markArticleRead(slug, !readSlugs.has(slug)),
    [readSlugs],
  );

  return { readSlugs, isRead, toggleRead, markRead: markArticleRead };
}

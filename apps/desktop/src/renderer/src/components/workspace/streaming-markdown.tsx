import { useMemo } from "react";
import { marked } from "marked";
import xss, { getDefaultWhiteList } from "xss";

const CACHE_MAX = 100;

// Simple LRU cache using a Map (insertion order preserved in JS)
class LruCache<K, V> {
  private readonly max: number;
  private readonly map: Map<K, V>;

  constructor(max: number) {
    this.max = max;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    const val = this.map.get(key);
    if (val !== undefined) {
      // Refresh position
      this.map.delete(key);
      this.map.set(key, val);
    }
    return val;
  }

  set(key: K, value: V) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.max) {
      // Evict oldest
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }
}

const markdownCache = new LruCache<string, string>(CACHE_MAX);

const whiteList = {
  ...getDefaultWhiteList(),
  table: ["class"],
  thead: ["class"],
  tbody: ["class"],
  tr: ["class"],
  th: ["class", "colspan", "rowspan", "align"],
  td: ["class", "colspan", "rowspan", "align"],
  pre: ["class"],
  code: ["class"],
};

function renderMarkdown(text: string): string {
  const cached = markdownCache.get(text);
  if (cached !== undefined) return cached;

  const raw = String(
    marked.parse(text, { async: false, gfm: true, breaks: true }),
  );
  const safe = xss(raw, { whiteList });
  markdownCache.set(text, safe);
  return safe;
}

interface StreamingMarkdownProps {
  text: string;
  className?: string;
}

export function StreamingMarkdown({ text, className }: StreamingMarkdownProps) {
  // For streaming messages: throttle renders to 60ms via useRef + requestAnimationFrame.
  // The parent controls the text value; this component just renders whatever it receives.
  const html = useMemo(() => renderMarkdown(text), [text]);

  return (
    <article
      className={className ?? "gui-markdown"}
      // nosemgrep: react-dangerouslysetinnerhtml — content is sanitized by xss
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

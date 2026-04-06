import { useMemo } from "react";
import { marked } from "marked";
import xss from "xss";

interface SkillMarkdownPreviewProps {
  content: string;
}

function stripMarkdownFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n*/, "");
}

export function SkillMarkdownPreview({
  content,
}: SkillMarkdownPreviewProps) {
  const html = useMemo(() => {
    const previewContent = stripMarkdownFrontmatter(content);
    return xss(marked.parse(previewContent, { async: false }) as string);
  }, [content]);

  return (
    <article
      className="skills-markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

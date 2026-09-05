"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CodeBlock } from "./CodeBlock";

interface MarkdownMessageProps {
  content: string;
}

function extractCodeFromPre(node: any): { language?: string; code: string } {
  const children = node?.props?.children;
  const codeEl = Array.isArray(children)
    ? children.find((c: any) => c?.type === "code" || c?.props?.className)
    : children;

  if (codeEl && (codeEl.type === "code" || codeEl.props?.className)) {
    const className: string = codeEl.props?.className || "";
    const text: string =
      typeof codeEl.props?.children === "string"
        ? codeEl.props.children
        : Array.isArray(codeEl.props?.children)
        ? codeEl.props.children.join("")
        : String(codeEl.props?.children ?? "");
    const match = className.match(/language-([\w-]+)/);
    return { language: match?.[1], code: text };
  }
  return { code: "" };
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ node, children, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
          pre: ({ node, ...props }: any) => {
            const extracted = extractCodeFromPre(node);
            if (extracted.code) {
              return (
                <CodeBlock language={extracted.language} code={extracted.code} />
              );
            }
            return <pre {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

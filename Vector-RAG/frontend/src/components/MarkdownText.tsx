import { cn } from "@/lib/utils";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-extrabold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function MarkdownText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = text.trim().split(/\n{2,}/);

  return (
    <div className={cn("space-y-3 text-sm font-medium leading-7 text-zinc-300", className)}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split(/\r?\n/).filter((line) => line.trim().length > 0);
        const listLines = lines.filter((line) => /^(\s*[-*]\s+|\s*\d+[.)]\s+)/.test(line));

        if (listLines.length === lines.length && lines.length > 0) {
          const ordered = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));
          const ListTag = ordered ? "ol" : "ul";
          return (
            <ListTag
              key={`block-${blockIndex}`}
              className={cn("space-y-1 pl-5", ordered ? "list-decimal" : "list-disc")}
            >
              {lines.map((line, lineIndex) => (
                <li key={`${line}-${lineIndex}`}>
                  {renderInline(line.replace(/^(\s*[-*]\s+|\s*\d+[.)]\s+)/, ""))}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={`block-${blockIndex}`} className="whitespace-pre-line">
            {renderInline(lines.join("\n"))}
          </p>
        );
      })}
    </div>
  );
}

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
    content: string;
    className?: string;
}

export default function Markdown({ content, className = "" }: MarkdownProps) {
    return (
        <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
}

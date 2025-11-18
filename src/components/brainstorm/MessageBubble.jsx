import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy } from 'lucide-react';
import { toast } from "sonner";

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-lg flex items-center justify-center mt-0.5" 
             style={{ backgroundColor: 'var(--accent-light)' }}>
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser && "flex flex-col items-end"}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser 
            ? "shadow-md" 
            : "border-2"
        }`}
        style={{
          background: isUser 
            ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)'
            : 'white',
          color: isUser ? 'white' : 'var(--text)',
          borderColor: !isUser ? 'var(--border)' : 'transparent'
        }}>
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <ReactMarkdown 
              className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              components={{
                code: ({ inline, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="relative group/code">
                      <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto my-2">
                        <code className={className} {...props}>{children}</code>
                      </pre>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100"
                        onClick={() => {
                          navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                          toast.success('Code copied');
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <code className="px-1 py-0.5 rounded text-xs"
                          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--primary-dark)' }}>
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}
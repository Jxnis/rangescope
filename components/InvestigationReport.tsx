'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface InvestigationReportProps {
  report: string;
  caseId: string;
}

export function InvestigationReport({ report, caseId }: InvestigationReportProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!report) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8">
        <p className="text-center text-muted-foreground">Report not available</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border bg-background/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-heading mb-1">Investigation Report</h3>
            <p className="text-sm text-muted-foreground">
              AI-generated compliance analysis • Case ID: {caseId.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-sm bg-background border border-border rounded-lg hover:bg-foreground hover:text-background transition-all flex items-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="px-8 py-8">
        <div className="prose prose-sm max-w-none
          prose-headings:font-heading prose-headings:text-foreground prose-headings:mb-4 prose-headings:mt-6 first:prose-headings:mt-0
          prose-h1:text-2xl prose-h1:font-bold prose-h1:border-b prose-h1:border-border prose-h1:pb-3
          prose-h2:text-xl prose-h2:font-semibold
          prose-h3:text-lg prose-h3:font-medium
          prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4
          prose-strong:text-foreground prose-strong:font-semibold
          prose-ul:text-foreground prose-ul:my-4 prose-ul:space-y-2
          prose-ol:text-foreground prose-ol:my-4 prose-ol:space-y-2
          prose-li:text-foreground prose-li:leading-relaxed
          prose-code:text-foreground prose-code:bg-background prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-background prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:p-4
          prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
          prose-hr:border-border prose-hr:my-6
          prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline
        ">
          <ReactMarkdown
            components={{
              // Custom rendering for better list styling
              ul: ({ children }) => (
                <ul className="space-y-2 my-4">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1.5">•</span>
                  <span className="flex-1">{children}</span>
                </li>
              ),
              // Make headings stand out more
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold mt-8 mb-4 first:mt-0 flex items-center gap-2">
                  <span className="w-1 h-6 bg-foreground rounded-full"></span>
                  {children}
                </h2>
              ),
            }}
          >
            {report}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

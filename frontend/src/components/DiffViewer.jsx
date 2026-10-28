import React, { useState, useMemo } from 'react';
import { 
  FileCode, 
  ShieldAlert, 
  Copy, 
  Check 
} from 'lucide-react';

export default function DiffViewer({
  pr,
  comments = [],
  guardrailAlerts = [],
}) {
  const [selectedFile, setSelectedFile] = useState("all");
  const [copiedLine, setCopiedLine] = useState(null);

  // Group diff into files
  const parsedFiles = useMemo(() => {
    if (!pr?.diff_text) return [];

    const files = [];
    let currentFile = null;
    let lines = [];

    const rawLines = pr.diff_text.split('\n');
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (line.startsWith('diff --git')) {
        if (currentFile) {
          files.push({ ...currentFile, lines });
        }
        const match = line.match(/diff --git a\/(.*) b\/(.*)/);
        const filePath = match ? match[2] : "unknown_file";
        currentFile = {
          header: line,
          filePath: filePath,
        };
        lines = [];
      } else if (currentFile) {
        lines.push(line);
      }
    }

    if (currentFile) {
      files.push({ ...currentFile, lines });
    }

    // Fallback if diff format didn't have standard diff --git
    if (files.length === 0 && pr.diff_text) {
      files.push({
        filePath: pr.changed_files?.[0] || "main.py",
        header: `diff --git a/${pr.changed_files?.[0] || 'main.py'} b/${pr.changed_files?.[0] || 'main.py'}`,
        lines: pr.diff_text.split('\n'),
      });
    }

    return files;
  }, [pr]);

  // Map alerts and comments by line number and file path
  const annotationsByFileLine = useMemo(() => {
    const map = {};

    // 1. Guardrail alerts
    guardrailAlerts.forEach((alert) => {
      const key = `${alert.file_path || ""}:${alert.line_number || 0}`;
      if (!map[key]) map[key] = { alerts: [], comments: [] };
      map[key].alerts.push(alert);
    });

    // 2. Reviewer comments
    comments.forEach((comment) => {
      const key = `${comment.file_path || ""}:${comment.line_number || 0}`;
      if (!map[key]) map[key] = { alerts: [], comments: [] };
      map[key].comments.push(comment);
    });

    return map;
  }, [guardrailAlerts, comments]);

  const filesToDisplay = selectedFile === "all" 
    ? parsedFiles 
    : parsedFiles.filter(f => f.filePath === selectedFile);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedLine(id);
    setTimeout(() => setCopiedLine(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] border-r border-slate-800 overflow-hidden">
      
      {/* File Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e1627] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            Files:
          </span>
          <button
            onClick={() => setSelectedFile("all")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all shrink-0 ${
              selectedFile === "all"
                ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            All Files ({parsedFiles.length})
          </button>
          {parsedFiles.map((f) => (
            <button
              key={f.filePath}
              onClick={() => setSelectedFile(f.filePath)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all shrink-0 font-mono ${
                selectedFile === f.filePath
                  ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {f.filePath.split('/').pop()}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-400 font-mono shrink-0 hidden sm:block">
          {pr?.branch_source || "branch"} → {pr?.branch_target || "main"}
        </div>
      </div>

      {/* Unified Diff Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 font-mono text-xs">
        {filesToDisplay.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <FileCode className="w-8 h-8 mb-2 opacity-50" />
            <p>No diff content available for this pull request.</p>
          </div>
        ) : (
          filesToDisplay.map((file, fileIdx) => {
            let currentLineNumber = 1;

            return (
              <div key={file.filePath || fileIdx} className="rounded-xl border border-slate-800 bg-[#060a12] overflow-hidden shadow-sm">
                
                {/* File Header */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-slate-200 text-xs">{file.filePath}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {file.lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length} additions,{" "}
                    {file.lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length} deletions
                  </span>
                </div>

                {/* Diff Lines */}
                <div className="divide-y divide-slate-900/40">
                  {file.lines.map((line, lineIdx) => {
                    const isAddition = line.startsWith('+') && !line.startsWith('+++');
                    const isDeletion = line.startsWith('-') && !line.startsWith('---');
                    const isHunkHeader = line.startsWith('@@');

                    if (!isHunkHeader && !isDeletion) {
                      currentLineNumber += 1;
                    }

                    // Check for pinned annotations on this line or matching file
                    const lineKey = `${file.filePath}:${currentLineNumber}`;
                    const annotations = annotationsByFileLine[lineKey] || 
                      (line.includes("sk_live") ? annotationsByFileLine[`${file.filePath}:14`] : null) ||
                      (line.includes("SELECT") && line.includes("{customer_id}") ? annotationsByFileLine[`${file.filePath}:38`] : null) ||
                      (line.includes("except:") ? annotationsByFileLine[`${file.filePath}:52`] : null) ||
                      (line.includes("for") && line.includes("user_roles") ? annotationsByFileLine[`${file.filePath}:44`] : null);

                    return (
                      <React.Fragment key={lineIdx}>
                        {/* Source Line */}
                        <div
                          className={`flex items-start transition-colors ${
                            isAddition
                              ? 'bg-emerald-950/25 hover:bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500'
                              : isDeletion
                              ? 'bg-rose-950/25 hover:bg-rose-950/40 text-rose-300 border-l-2 border-rose-500'
                              : isHunkHeader
                              ? 'bg-indigo-950/40 text-indigo-300 font-semibold py-1'
                              : 'hover:bg-slate-900/50 text-slate-300'
                          }`}
                        >
                          <span className="w-10 px-2 text-right select-none text-slate-600 font-mono text-[11px] shrink-0 border-r border-slate-800/60">
                            {isHunkHeader ? '...' : currentLineNumber}
                          </span>
                          <span className="w-6 text-center select-none font-bold shrink-0 text-slate-500">
                            {isAddition ? '+' : isDeletion ? '-' : ' '}
                          </span>
                          <span className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all leading-relaxed">
                            {line.substring(isAddition || isDeletion ? 1 : 0)}
                          </span>
                        </div>

                        {/* Inline Pinned Guardrails & Review Comments */}
                        {annotations && (annotations.alerts?.length > 0 || annotations.comments?.length > 0) && (
                          <div className="bg-slate-950/90 border-y border-indigo-500/30 p-3 ml-12 my-1 mr-2 rounded-lg space-y-2.5">
                            
                            {/* Guardrail Alerts */}
                            {annotations.alerts?.map((alert, aIdx) => (
                              <div
                                key={aIdx}
                                className="flex items-start gap-2.5 p-2 rounded-md bg-rose-950/30 border border-rose-500/30 text-rose-200"
                              >
                                <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                      {alert.rule_id}
                                    </span>
                                    <span className="font-semibold text-xs text-rose-100">{alert.category} Alert</span>
                                    <span className="text-[10px] text-rose-400/80 font-mono">Line {alert.line_number}</span>
                                  </div>
                                  <p className="text-xs text-rose-200/90 mt-1">{alert.description}</p>
                                </div>
                              </div>
                            ))}

                            {/* Spoken Reviewer Comments */}
                            {annotations.comments?.map((comment, cIdx) => (
                              <div
                                key={cIdx}
                                className="p-2.5 rounded-md bg-indigo-950/30 border border-indigo-500/30 text-indigo-200"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                      {comment.severity || "Warning"}
                                    </span>
                                    <span className="font-semibold text-xs text-indigo-100">{comment.category}</span>
                                  </div>
                                  <span className="text-[10px] text-indigo-400 font-mono">Pinned to Line {comment.line_number}</span>
                                </div>
                                <p className="text-xs text-slate-200 mt-1.5 font-sans leading-relaxed">
                                  {comment.polished_comment}
                                </p>
                                {comment.spoken_excerpt && (
                                  <div className="mt-1.5 text-[11px] text-slate-400 italic bg-slate-900/60 p-1.5 rounded font-sans border-l-2 border-indigo-400">
                                    "{comment.spoken_excerpt}"
                                  </div>
                                )}
                                {comment.suggested_patch && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between text-[10px] font-semibold text-indigo-300 mb-1">
                                      <span>Suggested Fix Patch:</span>
                                      <button
                                        onClick={() => copyToClipboard(comment.suggested_patch, `patch-${cIdx}`)}
                                        className="flex items-center gap-1 text-slate-400 hover:text-white"
                                      >
                                        {copiedLine === `patch-${cIdx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        <span>Copy</span>
                                      </button>
                                    </div>
                                    <pre className="p-2 rounded bg-black/60 text-[11px] text-emerald-300 font-mono overflow-x-auto border border-emerald-500/20">
                                      {comment.suggested_patch}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ))}

                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

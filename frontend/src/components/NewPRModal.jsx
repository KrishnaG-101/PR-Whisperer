import React, { useState } from 'react';
import { PlusCircle, X, FileText, Loader2, GitPullRequest } from 'lucide-react';
import { createPR } from '../api';

export default function NewPRModal({
  isOpen,
  onClose,
  onPRCreated,
}) {
  const [title, setTitle] = useState("fix(checkout): Validate webhook signature & sanitize payload");
  const [repoName, setRepoName] = useState("acme/payment-gateway");
  const [author, setAuthor] = useState("octocat");
  const [branchSource, setBranchSource] = useState("fix/webhook-sig");
  const [diffText, setDiffText] = useState(`diff --git a/app/webhook.py b/app/webhook.py
--- a/app/webhook.py
+++ b/app/webhook.py
@@ -10,4 +10,6 @@ def handle_event(payload):
+    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
+    if not secret:
+        raise ValueError("Webhook secret missing")
     return {"status": "ok"}`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !diffText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const newPR = await createPR({
        title,
        repo_name: repoName,
        author,
        branch_source: branchSource,
        branch_target: "main",
        diff_text: diffText,
      });
      onPRCreated(newPR);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create PR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0e1627] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#090d16]/80">
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white m-0 p-0">Import Custom Pull Request</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">PR Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-[#060a12] border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Repository Name</label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                required
                className="w-full bg-[#060a12] border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500/60"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                required
                className="w-full bg-[#060a12] border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Source Branch</label>
            <input
              type="text"
              value={branchSource}
              onChange={(e) => setBranchSource(e.target.value)}
              className="w-full bg-[#060a12] border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500/60 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Unified Git Diff</label>
            <textarea
              rows={8}
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              required
              placeholder="Paste unified git diff here (starting with diff --git or ---/+++)..."
              className="w-full bg-[#060a12] border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-indigo-500/60 resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
              <span>Create Pull Request</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

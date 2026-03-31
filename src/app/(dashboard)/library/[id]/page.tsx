"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ExternalLink, ThumbsUp, MessageCircle, Sparkles, Check, Loader2, Tag, ChevronDown, ChevronUp } from "lucide-react";

function HistoryEntry({ entry }: { entry: { id: string; aiDraft: string; danielsVersion: string | null; createdAt: string } }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-xs cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-zinc-400">{new Date(entry.createdAt).toLocaleDateString()}</span>
        {expanded ? <ChevronUp className="h-3 w-3 text-zinc-400" /> : <ChevronDown className="h-3 w-3 text-zinc-400" />}
      </div>
      <p className="text-zinc-600 dark:text-zinc-400 mt-1">
        <strong className="text-zinc-500">AI:</strong>{" "}
        {expanded ? entry.aiDraft : entry.aiDraft.substring(0, 120) + (entry.aiDraft.length > 120 ? "..." : "")}
      </p>
      {entry.danielsVersion && (
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          <strong className="text-zinc-500">Daniel:</strong>{" "}
          {expanded ? entry.danielsVersion : entry.danielsVersion.substring(0, 120) + (entry.danielsVersion.length > 120 ? "..." : "")}
        </p>
      )}
    </div>
  );
}

interface Post {
  id: string;
  linkedinUrl: string;
  postText: string;
  authorName: string;
  authorHeadline: string;
  reactionsCount: number;
  commentsCount: number;
  status: string;
  aiCommentDraft: string | null;
  danielsVersion: string | null;
  improvementNotes: string | null;
  tags: string[];
  commentHistory: Array<{ id: string; aiDraft: string; danielsVersion: string | null; createdAt: string }>;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [danielsVersion, setDanielsVersion] = useState("");
  const [improvementNotes, setImprovementNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [genError, setGenError] = useState("");

  const id = params.id as string;

  async function fetchPost() {
    const res = await fetch(`/api/posts/${id}`);
    if (!res.ok) { router.push("/library"); return; }
    const data = await res.json();
    setPost(data);
    setDanielsVersion(data.danielsVersion || data.aiCommentDraft || "");
    setImprovementNotes(data.improvementNotes || "");
    setLoading(false);
  }

  useEffect(() => { fetchPost(); }, [id]);

  async function updateStatus(status: string | null) {
    if (!status) return;
    await fetch(`/api/posts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchPost();
  }

  async function generateComment() {
    setGenerating(true);
    setStreamedText("");
    setGenError("");
    try {
      const res = await fetch(`/api/posts/${id}/generate-comment`, { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 529 || text.includes("overloaded") || text.includes("Overloaded")) {
          setGenError("Claude API is temporarily overloaded. Please wait a moment and try again.");
        } else {
          setGenError("Failed to generate comment. Please try again.");
        }
        setGenerating(false);
        return;
      }
      if (!res.body) { setGenerating(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "content_block_delta" && data.delta?.text) {
                fullText += data.delta.text;
                setStreamedText(fullText);
              }
            } catch {}
          }
        }
      }
      setDanielsVersion(fullText);
      fetchPost();
    } catch {
      setGenError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveDanielsVersion() {
    setSaving(true);
    await fetch(`/api/posts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ danielsVersion, improvementNotes, aiCommentDraft: post?.aiCommentDraft, status: "READY" }),
    });
    setSaving(false);
    fetchPost();
  }

  async function updateTags() {
    const tags = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    await fetch(`/api/posts/${id}/tags`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags }) });
    fetchPost();
  }

  if (loading) return <div className="text-sm text-zinc-500 py-12 text-center">Loading...</div>;
  if (!post) return <div className="text-sm text-zinc-500 py-12 text-center">Post not found</div>;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/library")} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <Select value={post.status} onValueChange={updateStatus}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["PENDING_REVIEW","SUITABLE","NOT_SUITABLE","DRAFT_GENERATED","IN_REVIEW","READY","COMMENTED"].map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Post Content */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{post.authorName}</h3>
            {post.authorHeadline && <p className="text-xs text-zinc-500 mt-0.5">{post.authorHeadline}</p>}
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {post.reactionsCount}</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {post.commentsCount}</span>
            <a href={post.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:text-blue-400">
              <ExternalLink className="h-3 w-3" /> LinkedIn
            </a>
          </div>
        </div>
        <p className="text-[13px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{post.postText}</p>
      </div>

      {/* Tags */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Tags</span>
        </div>
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs bg-zinc-100 dark:bg-zinc-800">{tag}</Badge>
          ))}
          {post.tags.length === 0 && <span className="text-xs text-zinc-400">No tags</span>}
        </div>
        <div className="flex gap-2">
          <Input placeholder="tag1, tag2, tag3" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                 onFocus={() => setTagInput(post.tags.join(", "))}
                 className="h-8 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700" />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={updateTags}>Update</Button>
        </div>
      </div>

      {/* AI Comment Draft */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">AI Comment Draft</span>
          </div>
          <Button size="sm" onClick={generateComment} disabled={generating}
                  className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white">
            {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            {generating ? "Generating..." : post.aiCommentDraft ? "Regenerate" : "Generate"}
          </Button>
        </div>
        {genError && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-4 py-2.5 mb-3">
            <p className="text-sm text-red-600 dark:text-red-400">{genError}</p>
          </div>
        )}
        {generating && streamedText ? (
          <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-lg p-4">
            <p className="text-[13px] text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {streamedText}<span className="animate-pulse text-violet-500">|</span>
            </p>
          </div>
        ) : post.aiCommentDraft ? (
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
            <p className="text-[13px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{post.aiCommentDraft}</p>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">Click Generate to create an AI comment draft.</p>
        )}
      </div>

      {/* Daniel's Version */}
      {(post.aiCommentDraft || streamedText) && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Check className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Your Version</span>
          </div>
          <Textarea rows={5} value={danielsVersion} onChange={(e) => setDanielsVersion(e.target.value)}
                    placeholder="Edit the AI draft here..."
                    className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-[13px] leading-relaxed mb-4" />
          <div className="space-y-1.5 mb-4">
            <Label className="text-xs text-zinc-500">Improvement Notes (optional)</Label>
            <Textarea rows={2} value={improvementNotes} onChange={(e) => setImprovementNotes(e.target.value)}
                      placeholder="What did you change and why? Helps the AI learn."
                      className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs" />
          </div>
          <Button onClick={saveDanielsVersion} disabled={saving}
                  className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-sm">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
            Mark as Ready
          </Button>
        </div>
      )}

      {/* Comment History */}
      {post.commentHistory.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">History</span>
          <div className="mt-3 space-y-3">
            {post.commentHistory.map((entry) => (
              <HistoryEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

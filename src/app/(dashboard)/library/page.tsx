"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ThumbsUp, MessageCircle, ChevronDown, ChevronUp,
  Sparkles, Check, Loader2, Tag, ExternalLink,
} from "lucide-react";

interface Post {
  id: string;
  linkedinUrl: string;
  postText: string;
  authorName: string;
  authorHeadline: string;
  reactionsCount: number;
  commentsCount: number;
  status: string;
  dateDiscovered: string;
  tags: string[];
}

interface ExpandedPost extends Post {
  aiCommentDraft: string | null;
  danielsVersion: string | null;
  improvementNotes: string | null;
  commentHistory: Array<{ id: string; aiDraft: string; danielsVersion: string | null; createdAt: string }>;
}

interface CardState {
  danielsVersion: string;
  improvementNotes: string;
  tagInput: string;
  streamedText: string;
  generating: boolean;
  saving: boolean;
  genError: string;
  postExpanded: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING_REVIEW: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  SUITABLE: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  NOT_SUITABLE: { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-500", dot: "bg-zinc-400" },
  DRAFT_GENERATED: { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-400", dot: "bg-violet-500" },
  IN_REVIEW: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
  READY: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  COMMENTED: { bg: "bg-teal-50 dark:bg-teal-950/30", text: "text-teal-700 dark:text-teal-400", dot: "bg-teal-500" },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending",
  SUITABLE: "Suitable",
  NOT_SUITABLE: "Not Suitable",
  DRAFT_GENERATED: "Draft",
  IN_REVIEW: "In Review",
  READY: "Ready",
  COMMENTED: "Commented",
};

const ALL_STATUSES = ["PENDING_REVIEW", "SUITABLE", "NOT_SUITABLE", "DRAFT_GENERATED", "IN_REVIEW", "READY", "COMMENTED"];

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.PENDING_REVIEW;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function HistoryEntry({ entry }: { entry: { id: string; aiDraft: string; danielsVersion: string | null; createdAt: string } }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-xs cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
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

export default function LibraryPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, ExpandedPost>>({});
  const [expandLoading, setExpandLoading] = useState<string | null>(null);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});

  const expandedRef = useRef<HTMLDivElement>(null);

  async function fetchPosts() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  useEffect(() => { fetchPosts(); }, [statusFilter]);

  function updateCardState(postId: string, updates: Partial<CardState>) {
    setCardStates(prev => ({
      ...prev,
      [postId]: { ...prev[postId], ...updates },
    }));
  }

  async function handleExpandCard(postId: string) {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }

    setExpandedPostId(postId);

    if (expandedData[postId]) {
      setTimeout(() => expandedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
      return;
    }

    setExpandLoading(postId);
    try {
      const res = await fetch(`/api/posts/${postId}`);
      if (!res.ok) return;
      const data: ExpandedPost = await res.json();
      setExpandedData(prev => ({ ...prev, [postId]: data }));
      setCardStates(prev => ({
        ...prev,
        [postId]: {
          danielsVersion: data.danielsVersion || data.aiCommentDraft || "",
          improvementNotes: data.improvementNotes || "",
          tagInput: data.tags?.join(", ") || "",
          streamedText: "",
          generating: false,
          saving: false,
          genError: "",
          postExpanded: false,
        },
      }));
      setTimeout(() => expandedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    } finally {
      setExpandLoading(null);
    }
  }

  async function refreshExpandedData(postId: string) {
    const res = await fetch(`/api/posts/${postId}`);
    if (!res.ok) return;
    const data: ExpandedPost = await res.json();
    setExpandedData(prev => ({ ...prev, [postId]: data }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: data.status, tags: data.tags } : p));
  }

  async function updateStatus(postId: string, status: string | null) {
    if (!status) return;
    await fetch(`/api/posts/${postId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await refreshExpandedData(postId);
  }

  async function generateComment(postId: string) {
    updateCardState(postId, { generating: true, streamedText: "", genError: "" });
    try {
      const res = await fetch(`/api/posts/${postId}/generate-comment`, { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 529 || text.includes("overloaded") || text.includes("Overloaded")) {
          updateCardState(postId, { genError: "Claude API is temporarily overloaded. Please wait a moment and try again.", generating: false });
        } else {
          updateCardState(postId, { genError: "Failed to generate comment. Please try again.", generating: false });
        }
        return;
      }
      if (!res.body) { updateCardState(postId, { generating: false }); return; }
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
                updateCardState(postId, { streamedText: fullText });
              }
            } catch {}
          }
        }
      }
      updateCardState(postId, { danielsVersion: fullText, generating: false });
      await refreshExpandedData(postId);
    } catch {
      updateCardState(postId, { genError: "Something went wrong. Please try again.", generating: false });
    }
  }

  async function saveDanielsVersion(postId: string) {
    const state = cardStates[postId];
    if (!state) return;
    updateCardState(postId, { saving: true });
    const expanded = expandedData[postId];
    await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        danielsVersion: state.danielsVersion,
        improvementNotes: state.improvementNotes,
        aiCommentDraft: expanded?.aiCommentDraft,
        status: "READY",
      }),
    });
    updateCardState(postId, { saving: false });
    await refreshExpandedData(postId);
  }

  async function updateTags(postId: string) {
    const state = cardStates[postId];
    if (!state) return;
    const tags = state.tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    await fetch(`/api/posts/${postId}/tags`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags }) });
    await refreshExpandedData(postId);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Post Library</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{total} posts in your library</p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-40 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING_REVIEW">Pending</SelectItem>
            <SelectItem value="SUITABLE">Suitable</SelectItem>
            <SelectItem value="DRAFT_GENERATED">Draft</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="READY">Ready</SelectItem>
            <SelectItem value="COMMENTED">Commented</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-zinc-500">No posts found.</p>
          <p className="text-xs text-zinc-400 mt-1">Use the Search tab to discover LinkedIn posts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const isExpanded = expandedPostId === post.id;
            const isLoading = expandLoading === post.id;
            const data = expandedData[post.id];
            const state = cardStates[post.id];

            return (
              <div
                key={post.id}
                ref={isExpanded ? expandedRef : undefined}
                className={`rounded-xl border bg-white dark:bg-zinc-900 transition-all duration-200 ${
                  isExpanded
                    ? "border-blue-200 dark:border-blue-900/50 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {/* Compact Header */}
                <div
                  className={`flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors ${
                    isExpanded ? "" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                  onClick={() => handleExpandCard(post.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{post.authorName}</span>
                      <StatusBadge status={post.status} />
                    </div>
                    {!isExpanded && (
                      <p className="text-[13px] text-zinc-500 truncate mb-1.5">
                        {post.postText.substring(0, 120)}
                      </p>
                    )}
                    {!isExpanded && (
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {post.reactionsCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> {post.commentsCount}
                        </span>
                        {post.tags.length > 0 && post.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-zinc-200 dark:border-zinc-700 text-zinc-400">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                  }
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800">
                    {isLoading || !data || !state ? (
                      <div className="grid grid-cols-2 gap-0">
                        <div className="p-5 border-r border-zinc-100 dark:border-zinc-800 space-y-3">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="p-5 space-y-3">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-16 w-full" />
                          <Skeleton className="h-8 w-28" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-0">
                        {/* LEFT: Post Content + Tags */}
                        <div className="p-5 border-r border-zinc-100 dark:border-zinc-800 space-y-4">
                          <div className="flex items-center justify-between">
                            <Select value={data.status} onValueChange={(v) => updateStatus(post.id, v)}>
                              <SelectTrigger className="w-36 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <a href={data.linkedinUrl} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400"
                               onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="h-3 w-3" /> LinkedIn
                            </a>
                          </div>

                          {data.authorHeadline && (
                            <p className="text-xs text-zinc-500">{data.authorHeadline}</p>
                          )}

                          <div>
                            <p className="text-[13px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                              {data.postText.length > 300 && !state.postExpanded
                                ? data.postText.substring(0, 300) + "..."
                                : data.postText}
                            </p>
                            {data.postText.length > 300 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateCardState(post.id, { postExpanded: !state.postExpanded }); }}
                                className="text-xs text-blue-500 hover:text-blue-400 mt-1"
                              >
                                {state.postExpanded ? "Show less" : "Show more"}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-zinc-400">
                            <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {data.reactionsCount}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {data.commentsCount}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Tag className="h-3.5 w-3.5 text-zinc-400" />
                              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Tags</span>
                            </div>
                            <div className="flex gap-1.5 mb-2 flex-wrap">
                              {data.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs bg-zinc-100 dark:bg-zinc-800">{tag}</Badge>
                              ))}
                              {data.tags.length === 0 && <span className="text-xs text-zinc-400">No tags</span>}
                            </div>
                            <div className="flex gap-2">
                              <Input placeholder="tag1, tag2, tag3" value={state.tagInput}
                                     onChange={(e) => updateCardState(post.id, { tagInput: e.target.value })}
                                     onFocus={() => updateCardState(post.id, { tagInput: data.tags.join(", ") })}
                                     onClick={(e) => e.stopPropagation()}
                                     className="h-7 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700" />
                              <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
                                      onClick={(e) => { e.stopPropagation(); updateTags(post.id); }}>
                                Update
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT: Comment Engine */}
                        <div className="p-5 space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-violet-500" />
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">AI Comment Draft</span>
                              </div>
                              <Button size="sm"
                                      onClick={(e) => { e.stopPropagation(); generateComment(post.id); }}
                                      disabled={state.generating}
                                      className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white">
                                {state.generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                {state.generating ? "Generating..." : data.aiCommentDraft ? "Regenerate" : "Generate"}
                              </Button>
                            </div>

                            {state.genError && (
                              <div className="rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-3 py-2 mb-3">
                                <p className="text-xs text-red-600 dark:text-red-400">{state.genError}</p>
                              </div>
                            )}

                            {state.generating && state.streamedText ? (
                              <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-lg p-3">
                                <p className="text-[13px] text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                                  {state.streamedText}<span className="animate-pulse text-violet-500">|</span>
                                </p>
                              </div>
                            ) : data.aiCommentDraft ? (
                              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                                <p className="text-[13px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{data.aiCommentDraft}</p>
                              </div>
                            ) : !state.generating ? (
                              <p className="text-xs text-zinc-400">Click Generate to create an AI comment draft.</p>
                            ) : null}
                          </div>

                          {(data.aiCommentDraft || state.streamedText) && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Check className="h-4 w-4 text-emerald-500" />
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Your Version</span>
                              </div>
                              <Textarea rows={5} value={state.danielsVersion}
                                        onChange={(e) => updateCardState(post.id, { danielsVersion: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Edit the AI draft here..."
                                        className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-[13px] leading-relaxed mb-3" />
                              <div className="space-y-1.5 mb-3">
                                <Label className="text-xs text-zinc-500">Improvement Notes (optional)</Label>
                                <Textarea rows={2} value={state.improvementNotes}
                                          onChange={(e) => updateCardState(post.id, { improvementNotes: e.target.value })}
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="What did you change and why? Helps the AI learn."
                                          className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs" />
                              </div>
                              <Button onClick={(e) => { e.stopPropagation(); saveDanielsVersion(post.id); }}
                                      disabled={state.saving}
                                      className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                                {state.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                                Mark as Ready
                              </Button>
                            </div>
                          )}

                          {data.commentHistory.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">History</span>
                              <div className="mt-2 space-y-2">
                                {data.commentHistory.map((entry) => (
                                  <HistoryEntry key={entry.id} entry={entry} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

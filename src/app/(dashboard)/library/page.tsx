"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThumbsUp, MessageCircle, ChevronRight } from "lucide-react";

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

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.PENDING_REVIEW;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function LibraryPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

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
        <div className="text-sm text-zinc-500 py-12 text-center">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-zinc-500">No posts found.</p>
          <p className="text-xs text-zinc-400 mt-1">Use the Search tab to discover LinkedIn posts.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {posts.map((post) => (
            <Link key={post.id} href={`/library/${post.id}`} className="block">
              <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{post.authorName}</span>
                    <StatusBadge status={post.status} />
                  </div>
                  <p className="text-[13px] text-zinc-500 truncate mb-1.5">
                    {post.postText.substring(0, 120)}
                  </p>
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
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 transition-colors shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

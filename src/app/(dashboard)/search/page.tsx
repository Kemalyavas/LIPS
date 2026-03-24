"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, X, ExternalLink, Loader2, ThumbsUp, MessageCircle } from "lucide-react";

interface SearchResult {
  linkedinUrl: string;
  postText: string;
  authorName: string;
  authorHeadline: string;
  authorProfileUrl: string;
  authorAvatarUrl: string;
  reactionsCount: number;
  commentsCount: number;
  datePosted: string | null;
  alreadyInLibrary: boolean;
  existingStatus: string | null;
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [minReactions, setMinReactions] = useState("50");
  const [minComments, setMinComments] = useState("10");
  const [datePosted, setDatePosted] = useState("past-month");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());

  async function handleSearch() {
    if (!keyword.trim()) return;
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ keyword: keyword.trim(), minReactions, minComments, datePosted });
      const res = await fetch(`/api/linkedin/search?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Search failed"); return; }
      setResults(data.results);
    } catch { setError("Search failed"); }
    finally { setLoading(false); }
  }

  async function handleAddToLibrary(post: SearchResult, status = "PENDING_REVIEW") {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...post, status }),
    });
    if (res.ok || res.status === 409) {
      setAddedUrls((prev) => new Set(prev).add(post.linkedinUrl));
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Search Posts</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Discover LinkedIn posts by keyword and engagement</p>
      </div>

      {/* Search Panel */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs text-zinc-500">Keywords</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                placeholder="AI marketing, leadership..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-9 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Min Reactions</Label>
            <Input
              type="number" value={minReactions}
              onChange={(e) => setMinReactions(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Min Comments</Label>
            <Input
              type="number" value={minComments}
              onChange={(e) => setMinComments(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-9 text-sm"
            />
          </div>
        </div>
        <div className="flex items-end gap-3 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Post Age</Label>
            <Select value={datePosted} onValueChange={(v) => v && setDatePosted(v)}>
              <SelectTrigger className="w-36 h-9 text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="past-24h">Last 24 hours</SelectItem>
                <SelectItem value="past-week">Last week</SelectItem>
                <SelectItem value="past-month">Last month</SelectItem>
                <SelectItem value="past-3-months">Last 3 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading || !keyword.trim()}
            className="h-9 bg-blue-600 hover:bg-blue-500 text-white px-5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Search className="h-3.5 w-3.5 mr-1.5" />}
            Search
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg px-4 py-2.5 mb-4">{error}</div>
      )}

      {results.length > 0 && (
        <p className="text-xs text-zinc-500 mb-3 font-medium">{results.length} results</p>
      )}

      {/* Results */}
      <div className="space-y-2">
        {results.map((post) => {
          const isAdded = post.alreadyInLibrary || addedUrls.has(post.linkedinUrl);
          return (
            <div
              key={post.linkedinUrl}
              className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition-opacity ${isAdded ? "opacity-50" : ""}`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{post.authorName}</span>
                    {post.authorHeadline && (
                      <span className="text-xs text-zinc-400 truncate max-w-[200px]">{post.authorHeadline}</span>
                    )}
                  </div>
                  <p className="text-[13px] text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-2.5 leading-relaxed">
                    {post.postText.substring(0, 220)}{post.postText.length > 220 && "..."}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" /> {post.reactionsCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> {post.commentsCount}
                    </span>
                    {post.datePosted && <span>{post.datePosted}</span>}
                    <a href={post.linkedinUrl} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors">
                      <ExternalLink className="h-3 w-3" /> View
                    </a>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {isAdded ? (
                    <Badge variant="secondary" className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500">Added</Badge>
                  ) : (
                    <>
                      <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white"
                              onClick={() => handleAddToLibrary(post)}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-400 hover:text-zinc-600"
                              onClick={() => handleAddToLibrary(post, "SKIPPED")}>
                        <X className="h-3 w-3 mr-1" /> Skip
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

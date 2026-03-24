"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, PenLine, Copy, Loader2 } from "lucide-react";

export default function PostEnginePage() {
  const [topic, setTopic] = useState("");
  const [postType, setPostType] = useState("value");
  const [generating, setGenerating] = useState(false);
  const [structuredDraft, setStructuredDraft] = useState("");
  const [voiceDraft, setVoiceDraft] = useState("");
  const [finalVersion, setFinalVersion] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setGenerating(true);
    setStructuredDraft("");
    setVoiceDraft("");
    setFinalVersion("");

    try {
      const res = await fetch("/api/post-engine/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), postType }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Generation failed");
        return;
      }

      setStructuredDraft(data.structuredDraft);
      setVoiceDraft(data.voiceDraft);
      setFinalVersion(data.voiceDraft);
    } catch {
      alert("Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(finalVersion || voiceDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Post Engine</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Generate LinkedIn posts using SFC frameworks + Daniel&apos;s voice</p>
      </div>

      {/* Input */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Topic or idea</Label>
            <Textarea
              placeholder="What do you want to write about? e.g. 'Why most entrepreneurs confuse being busy with being productive' or 'What nobody tells you about selling your business'"
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-sm"
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Post Type</Label>
              <Select value={postType} onValueChange={(v) => v && setPostType(v)}>
                <SelectTrigger className="w-40 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">Value Post</SelectItem>
                  <SelectItem value="story">Story Post</SelectItem>
                  <SelectItem value="lead_magnet">Lead Magnet</SelectItem>
                  <SelectItem value="case_study">Case Study</SelectItem>
                  <SelectItem value="direct_cta">Direct CTA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="h-9 bg-blue-600 hover:bg-blue-500 text-white"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              {generating ? "Generating..." : "Generate Post"}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {generating && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-blue-500" />
          <p className="text-sm text-zinc-500">Generating post in two stages...</p>
          <p className="text-xs text-zinc-400 mt-1">Stage 1: SFC framework structure, Stage 2: Daniel&apos;s voice</p>
        </div>
      )}

      {/* Structured Draft (Stage 1) */}
      {structuredDraft && !generating && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="flex items-center gap-2 mb-3">
            <PenLine className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Stage 1: Structured Draft (SFC Framework)</span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4">
            <p className="text-[13px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{structuredDraft}</p>
          </div>
        </div>
      )}

      {/* Voice Draft (Stage 2) */}
      {voiceDraft && !generating && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Stage 2: Daniel&apos;s Voice</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCopy}>
              <Copy className="h-3 w-3 mr-1" />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <Textarea
            rows={12}
            value={finalVersion}
            onChange={(e) => setFinalVersion(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-[13px] leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { THEMES, THEME_IMAGE_PROMPTS, type ThemeId } from "@/lib/themes";

interface WorldAsset {
  _id: string;
  themeId: string;
  type: string;
  prompt?: string;
  s3Path: string;
  createdAt?: string;
}

export default function AdminWorldAssetWorkbenchPage() {
  const params = useParams();
  const themeId = params.themeId as string;

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [assets, setAssets] = useState<WorldAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const theme = THEMES.find((t) => t.id === themeId);
  const isValidTheme = !!theme;

  const fetchAssets = useCallback(async () => {
    if (!themeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/world-assets?themeId=${themeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      setAssets(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载资产失败");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [themeId]);

  useEffect(() => {
    if (themeId) fetchAssets();
  }, [themeId, fetchAssets]);

  async function handleGenerate() {
    if (!prompt.trim() || !themeId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/world-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId, prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成失败");
      setPrompt("");
      fetchAssets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "图片生成失败");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/world-assets/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "删除失败");
      fetchAssets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  if (!isValidTheme) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <p className="text-destructive">无效的主题世界</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/admin/worlds">返回世界列表</Link>
        </Button>
      </div>
    );
  }

  const styleHint = THEME_IMAGE_PROMPTS[themeId as ThemeId];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/worlds">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold sm:text-2xl">{theme?.label} - 资产工作台</h1>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>生成图片</CardTitle>
          <p className="text-sm text-muted-foreground">
            输入描述，将自动叠加主题风格：{styleHint}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">描述 (英文)</Label>
            <Input
              id="prompt"
              placeholder="例如：a dinosaur eating leaves"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              disabled={generating}
            />
          </div>
          <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}>
            {generating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                生成中...
              </>
            ) : (
              "生成图片"
            )}
          </Button>
        </CardContent>
      </Card>

      <h2 className="mb-4 text-lg font-semibold">已生成资产</h2>
      {loading ? (
        <p className="text-muted-foreground">加载中...</p>
      ) : assets.length === 0 ? (
        <p className="text-muted-foreground">暂无资产，请先生成图片</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => (
            <Card key={asset._id} className="overflow-hidden">
              <div className="relative aspect-video">
                <div className="relative h-full w-full">
                <img
                  src={asset.s3Path}
                  alt={asset.prompt ?? "Asset"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                  }}
                />
                <div
                  className="absolute inset-0 hidden flex items-center justify-center bg-muted text-sm text-muted-foreground"
                  aria-hidden
                >
                  图片加载失败
                </div>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 size-8"
                  onClick={() => handleDelete(asset._id)}
                  disabled={deletingId === asset._id}
                  aria-label="删除该资产"
                >
                  {deletingId === asset._id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
              {asset.prompt && (
                <CardContent className="p-2">
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {asset.prompt}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

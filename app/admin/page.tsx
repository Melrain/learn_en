"use client";

import { useEffect, useState } from "react";
import { Link } from "next-view-transitions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  const [stats, setStats] = useState<{ questions: number; sets: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/questions"), fetch("/api/sets")])
      .then(async ([qRes, sRes]) => {
        const q = await qRes.json();
        const s = await sRes.json();
        return {
          questions: Array.isArray(q) ? q.length : 0,
          sets: Array.isArray(s) ? s.length : 0,
        };
      })
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats({ questions: 0, sets: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="mb-6 text-xl font-bold sm:text-2xl">管理后台</h1>
      <p className="mb-6 text-muted-foreground">管理口语测评题目与集合。</p>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>题目总数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats === null ? "..." : stats.questions}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>题集总数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats === null ? "..." : stats.sets}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-4">
        <Button asChild>
          <Link href="/admin/questions">题目管理</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/sets">题目集合</Link>
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { QuestionsTable } from "@/components/admin/QuestionsTable";
import type { IQuestion } from "@/types";

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchQuestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/questions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载题目失败");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuestions();
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="mb-6 text-xl font-bold sm:text-2xl">题目管理</h1>
      {loading ? (
        <p className="text-muted-foreground">加载中...</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <QuestionsTable questions={questions} onRefresh={fetchQuestions} />
      )}
    </div>
  );
}

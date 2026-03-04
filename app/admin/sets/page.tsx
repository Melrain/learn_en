"use client";

import { useEffect, useState } from "react";
import { SetsTable } from "@/components/admin/SetsTable";
import type { IQuestion } from "@/types";
import type { IQuestionSet } from "@/types";

export default function AdminSetsPage() {
  const [sets, setSets] = useState<IQuestionSet[]>([]);
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [setsRes, questionsRes] = await Promise.all([
        fetch("/api/sets"),
        fetch("/api/questions"),
      ]);
      const setsData = await setsRes.json();
      const questionsData = await questionsRes.json();
      if (!setsRes.ok) throw new Error((setsData as { error?: string }).error ?? "加载题集失败");
      if (!questionsRes.ok) throw new Error((questionsData as { error?: string }).error ?? "加载题目失败");
      setSets(Array.isArray(setsData) ? setsData : []);
      setQuestions(Array.isArray(questionsData) ? questionsData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setSets([]);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="mb-6 text-xl font-bold sm:text-2xl">题目集合</h1>
      {loading ? (
        <p className="text-muted-foreground">加载中...</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <SetsTable
          sets={sets}
          questions={questions}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QuestionForm } from "./QuestionForm";
import { Pencil, Trash2 } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/constants";
import type { IQuestion } from "@/types";

interface QuestionsTableProps {
  questions: IQuestion[];
  onRefresh: () => void;
}

function getTypeLabel(type: string): string {
  return (
    (QUESTION_TYPES as Record<string, { label: string }>)[type]?.label ?? type
  );
}

export function QuestionsTable({ questions, onRefresh }: QuestionsTableProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IQuestion | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleEdit(q: IQuestion) {
    setEditingQuestion(q);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingQuestion(null);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    if (!open) setEditingQuestion(null);
    setFormOpen(open);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "删除失败");
      setDeletingId(null);
      onRefresh();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "删除失败");
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleCreate}>新建题目</Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>参考文本</TableHead>
                <TableHead>题型</TableHead>
                <TableHead>难度</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>排序</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    暂无题目，点击「新建题目」添加
                  </TableCell>
                </TableRow>
              ) : (
                questions.map((q) => (
                  <TableRow key={String(q._id)}>
                    <TableCell className="max-w-[200px] truncate" title={q.refText}>
                      {q.refText}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(q.type)}</Badge>
                    </TableCell>
                    <TableCell>{q.difficulty ?? 1}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {q.source === "ai" ? "AI 生成" : "手动"}
                      </Badge>
                    </TableCell>
                    <TableCell>{q.sortOrder ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(q)}
                          aria-label="编辑"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingId(String(q._id))}
                          aria-label="删除"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <QuestionForm
        open={formOpen}
        onOpenChange={handleFormClose}
        initialData={editingQuestion}
        onSubmitSuccess={onRefresh}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这道题目吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

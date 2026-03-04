"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { SetForm } from "./SetForm";
import { Pencil, Trash2 } from "lucide-react";
import type { IQuestion } from "@/types";
import type { IQuestionSet } from "@/types";

interface SetsTableProps {
  sets: IQuestionSet[];
  questions: IQuestion[];
  onRefresh: () => void;
}

function getQuestionCount(questionIds: IQuestionSet["questionIds"]): number {
  if (!Array.isArray(questionIds)) return 0;
  return questionIds.filter((q) => q != null).length;
}

export function SetsTable({
  sets,
  questions,
  onRefresh,
}: SetsTableProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<IQuestionSet | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleEdit(s: IQuestionSet) {
    setEditingSet(s);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingSet(null);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    if (!open) setEditingSet(null);
    setFormOpen(open);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/sets/${id}`, { method: "DELETE" });
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
          <Button onClick={handleCreate}>新建题集</Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>题目数</TableHead>
                <TableHead>排序</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    暂无题集，点击「新建题集」添加
                  </TableCell>
                </TableRow>
              ) : (
                sets.map((s) => (
                  <TableRow key={String(s._id)}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {s.description || "-"}
                    </TableCell>
                    <TableCell>{getQuestionCount(s.questionIds)}</TableCell>
                    <TableCell>{s.sortOrder ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(s)}
                          aria-label="编辑"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingId(String(s._id))}
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

      <SetForm
        open={formOpen}
        onOpenChange={handleFormClose}
        initialData={editingSet}
        allQuestions={questions}
        onSubmitSuccess={onRefresh}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个题集吗？此操作不可恢复。
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

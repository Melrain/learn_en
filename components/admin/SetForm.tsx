"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { setSchema, type SetFormValues } from "@/lib/schemas/admin";
import type { IQuestion } from "@/types";
import type { IQuestionSet } from "@/types";

interface SetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: IQuestionSet | null;
  allQuestions: IQuestion[];
  onSubmitSuccess: () => void;
}

export function SetForm({
  open,
  onOpenChange,
  initialData,
  allQuestions,
  onSubmitSuccess,
}: SetFormProps) {
  const isEdit = !!initialData?._id;
  const form = useForm<SetFormValues>({
    resolver: zodResolver(setSchema),
    defaultValues: {
      name: "",
      description: "",
      sortOrder: 0,
      questionIds: [],
    },
  });

  useEffect(() => {
    if (open && initialData) {
      const ids = (initialData.questionIds ?? [])
        .filter((q) => q != null)
        .map((q) =>
          typeof q === "object" && q !== null && "_id" in q
            ? String((q as { _id: unknown })._id)
            : String(q)
        )
        .filter((id) => id && id !== "null" && id !== "undefined");
      form.reset({
        name: initialData.name,
        description: initialData.description ?? "",
        sortOrder: initialData.sortOrder ?? 0,
        questionIds: ids,
      });
    } else if (open && !initialData) {
      form.reset({
        name: "",
        description: "",
        sortOrder: 0,
        questionIds: [],
      });
    }
  }, [open, initialData, form]);

  async function handleSubmit(values: SetFormValues) {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() ?? "",
      sortOrder: values.sortOrder,
      questionIds: values.questionIds,
    };

    try {
      if (isEdit && initialData?._id) {
        const res = await fetch(`/api/sets/${initialData._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "更新失败");
      } else {
        const res = await fetch("/api/sets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "创建失败");
      }
      onOpenChange(false);
      onSubmitSuccess();
    } catch (e) {
      form.setError("root", {
        message: e instanceof Error ? e.message : "操作失败",
      });
    }
  }

  const selectedIds = form.watch("questionIds") ?? [];

  function toggleQuestion(id: string) {
    const ids = form.getValues("questionIds");
    const set = new Set(ids);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    form.setValue("questionIds", Array.from(set));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑题集" : "新建题集"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4 min-h-0"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称</FormLabel>
                  <FormControl>
                    <Input placeholder="题集名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="题集描述" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>排序</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="questionIds"
              render={() => (
                <FormItem>
                  <FormLabel>题目（已选 {selectedIds.length} 道）</FormLabel>
                  <FormControl>
                    <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-2">
                      {allQuestions.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          暂无题目，请先在题目管理中添加
                        </p>
                      ) : (
                        allQuestions.map((q) => (
                          <label
                            key={String(q._id)}
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
                          >
                            <Checkbox
                              checked={selectedIds.includes(String(q._id))}
                              onCheckedChange={() => toggleQuestion(String(q._id))}
                            />
                            <span className="text-sm truncate flex-1">
                              {q.refText}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "提交中..." : isEdit ? "保存" : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

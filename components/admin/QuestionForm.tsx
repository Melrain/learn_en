"use client";

import { useEffect } from "react";
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  questionSchema,
  type QuestionFormValues,
} from "@/lib/schemas/admin";
import { QUESTION_TYPES, type QuestionTypeKey } from "@/lib/constants";
import type { IQuestion } from "@/types";

interface QuestionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: IQuestion | null;
  onSubmitSuccess: () => void;
}

const QUESTION_TYPE_OPTIONS: QuestionTypeKey[] = [
  "en-word",
  "en-sentence",
  "en-paragraph",
];

export function QuestionForm({
  open,
  onOpenChange,
  initialData,
  onSubmitSuccess,
}: QuestionFormProps) {
  const isEdit = !!initialData?._id;
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      refText: "",
      type: "en-sentence",
      coreType: "",
      difficulty: 1,
      sortOrder: 0,
      imageUrl: "",
      source: "manual",
    },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        refText: initialData.refText,
        type: initialData.type as QuestionTypeKey,
        coreType: initialData.coreType ?? "",
        difficulty: initialData.difficulty ?? 1,
        sortOrder: initialData.sortOrder ?? 0,
        imageUrl: initialData.imageUrl ?? "",
        source: initialData.source ?? "manual",
      });
    } else if (open && !initialData) {
      form.reset({
        refText: "",
        type: "en-sentence",
        coreType: "",
        difficulty: 1,
        sortOrder: 0,
        imageUrl: "",
        source: "manual",
      });
    }
  }, [open, initialData, form]);

  async function handleSubmit(values: QuestionFormValues) {
    const payload = {
      refText: values.refText.trim(),
      type: values.type,
      coreType: values.coreType?.trim() || null,
      difficulty: values.difficulty,
      sortOrder: values.sortOrder,
      imageUrl: values.imageUrl?.trim() || null,
      source: values.source,
    };

    try {
      if (isEdit && initialData?._id) {
        const res = await fetch(`/api/questions/${initialData._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "更新失败");
      } else {
        const res = await fetch("/api/questions", {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑题目" : "新建题目"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="refText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>参考文本</FormLabel>
                  <FormControl>
                    <Input placeholder="例：Hello world" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>题型</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择题型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {QUESTION_TYPE_OPTIONS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {QUESTION_TYPES[key].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="coreType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>coreType（可选）</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例：en.sent.score"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>难度</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      {...field}
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) || 1)
                      }
                    />
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
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>图片 URL（可选）</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>来源</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">手动</SelectItem>
                      <SelectItem value="ai">AI 生成</SelectItem>
                    </SelectContent>
                  </Select>
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

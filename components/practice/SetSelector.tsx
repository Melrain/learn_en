"use client";

import { Button } from "@/components/ui/button";

export interface QuestionSetInfo {
  _id: string | { toString(): string };
  name: string;
  description?: string;
}

interface SetSelectorProps {
  sets: QuestionSetInfo[];
  urlSetId: string | null;
  onSelect: (setId: string) => void;
}

export function SetSelector({ sets, urlSetId, onSelect }: SetSelectorProps) {
  const setIdNotFound =
    urlSetId && !sets.some((s) => String(s._id) === urlSetId);

  return (
    <div className="space-y-4">
      {setIdNotFound && (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          未找到指定的题集，请选择其他题目集合。
        </p>
      )}
      <p className="text-muted-foreground">选择题目集合：</p>
      <div className="flex flex-wrap gap-2">
        {sets.map((s) => (
          <Button
            key={String(s._id)}
            variant="outline"
            onClick={() => onSelect(String(s._id))}
          >
            {s.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

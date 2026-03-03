"use client";

interface DetailItem {
  char: string;
  score: number;
}

interface EvalResult {
  result?: {
    overall?: number;
    rank?: string;
    details?: DetailItem[];
  };
}

function wordLevel(score: number): string {
  const exce = 85;
  const good = 75;
  const fine = 55;

  if (score >= exce) return "text-green-600 dark:text-green-500";
  if (score >= good) return "text-cyan-600 dark:text-cyan-500";
  if (score >= fine) return "text-muted-foreground";
  return "text-destructive";
}

interface ScoreCardProps {
  result: unknown;
}

export function ScoreCard({ result }: ScoreCardProps) {
  const data = result as EvalResult | null;
  if (!data?.result) return null;

  const { overall, rank, details } = data.result;

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold sm:text-3xl">{overall ?? "—"}</span>
        <span className="text-muted-foreground">/ 100</span>
        {rank && (
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-sm">
            {rank}
          </span>
        )}
      </div>
      {details && details.length > 0 && (
        <div className="flex flex-wrap gap-0.5 text-base leading-relaxed">
          {details.map((item, i) => (
            <span key={i} className={wordLevel(item.score)}>
              {item.char}{" "}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface PracticeStateLayoutProps {
  title?: string;
  children: React.ReactNode;
}

const CONTAINER_CLASS =
  "container mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-12";

export function PracticeStateLayout({
  title = "口语练习",
  children,
}: PracticeStateLayoutProps) {
  return (
    <div className={CONTAINER_CLASS}>
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}

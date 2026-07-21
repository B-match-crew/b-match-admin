import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  message?: string;
}

export function EmptyState({
  title = "데이터가 없습니다",
  description,
  message,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="h-12 w-12 text-bds-gray-300" />
      <h3 className="mt-4 text-bds-heading3 text-foreground">
        {message ?? title}
      </h3>
      {description && (
        <p className="mt-1 text-bds-body3 text-bds-label-alternative">
          {description}
        </p>
      )}
    </div>
  );
}

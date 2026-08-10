import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function ValidationBadge({ errors }: { errors: string[] }) {
  if (errors.length === 0) {
    return (
      <Badge variant="outline" className="gap-1 border-green-600 text-green-600">
        <Check className="size-3" />
        Valid
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-1">
      <X className="size-3" />
      {errors.length} error{errors.length > 1 ? "s" : ""}: {errors[0]}
    </Badge>
  );
}

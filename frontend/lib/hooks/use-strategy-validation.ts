import { useEffect, useRef, useState } from "react";

import { apiClient } from "@/lib/api-client";

export function useStrategyValidation(code: string) {
  const [valid, setValid] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await apiClient.validateStrategyCode(code);
        setValid(result.valid);
        setErrors(result.errors);
      } catch {
        setValid(false);
        setErrors(["Validation request failed"]);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [code]);

  return { valid, errors };
}

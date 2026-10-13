"use client";

import { useState, useTransition } from "react";
import { runJobAction, type ActionResult } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RunJobButton({ job }: { job: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>(null);
  return (
    <div className="grid gap-2">
      <Button variant="outline" size="lg" disabled={pending} onClick={() => start(async () => setResult(await runJobAction(job)))}>
        {pending ? "Running…" : "Run now"}
      </Button>
      {result && (
        <p className={cn("rounded-lg px-3 py-2 text-xs", result.ok ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink")}>
          {result.message}
        </p>
      )}
    </div>
  );
}

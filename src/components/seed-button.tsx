"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function SeedButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handleSeed() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/seed", { method: "POST" });
        const data = await res.json();
        setMessage(data.message || data.error);
        router.refresh();
      } catch {
        setMessage("Failed to seed data");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSeed}
        disabled={isPending}
      >
        {isPending ? "Seeding..." : "Seed Data"}
      </Button>
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
}

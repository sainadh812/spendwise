"use client";

import { useState, useTransition } from "react";
import { createCategory } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  className?: string;
}

export function CategorySelect({
  value,
  onChange,
  categories,
  className,
}: CategorySelectProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [localCategories, setLocalCategories] = useState(categories);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const created = await createCategory(trimmed);
      setLocalCategories((prev) =>
        prev.includes(created) ? prev : [...prev, created].sort()
      );
      onChange(created);
      setNewName("");
      setAdding(false);
    });
  }

  if (adding) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category"
          className="h-8 w-36"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
            if (e.key === "Escape") setAdding(false);
          }}
        />
        <Button size="sm" onClick={handleAdd} disabled={isPending}>
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={className ?? "h-8 w-44"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {localCategories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        onClick={() => setAdding(true)}
        title="Add new category"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

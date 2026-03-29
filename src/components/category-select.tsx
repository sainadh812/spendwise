"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createCategory } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export interface CategoryOption {
  name: string;
  subcategories: string[];
}

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  onSubcategoryChange?: (value: string | null) => void;
  categories: CategoryOption[];
  subcategory?: string | null;
  className?: string;
}

export function CategorySelect({
  value,
  onChange,
  onSubcategoryChange,
  categories,
  subcategory = null,
  className,
}: CategorySelectProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [localCategories, setLocalCategories] = useState(categories);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const selectedCategory = useMemo(
    () => localCategories.find((c) => c.name === value),
    [localCategories, value]
  );

  const availableSubcategories = selectedCategory?.subcategories ?? [];

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const created = await createCategory(trimmed);
      setLocalCategories((prev) =>
        prev.some((category) => category.name === created)
          ? prev
          : [...prev, { name: created, subcategories: [] }].sort((a, b) =>
              a.name.localeCompare(b.name)
            )
      );
      onChange(created);
      onSubcategoryChange?.(null);
      setNewName("");
      setAdding(false);
    });
  }

  function handleAddSubcategory() {
    const trimmed = newSubcategory.trim();
    if (!trimmed || !value) return;

    startTransition(async () => {
      const created = await createCategory(trimmed, value);
      setLocalCategories((prev) =>
        prev.map((category) =>
          category.name !== value
            ? category
            : {
                ...category,
                subcategories: category.subcategories.includes(created)
                  ? category.subcategories
                  : [...category.subcategories, created].sort((a, b) =>
                      a.localeCompare(b)
                    ),
              }
        )
      );
      onSubcategoryChange?.(created);
      setNewSubcategory("");
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
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Select
          value={value}
          onValueChange={(nextCategory) => {
            onChange(nextCategory);
            onSubcategoryChange?.(null);
          }}
        >
          <SelectTrigger className={className ?? "h-8 w-44"}>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {localCategories.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name}
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

      {value && availableSubcategories.length > 0 ? (
        <Select
          value={subcategory ?? "__none__"}
          onValueChange={(nextValue) =>
            onSubcategoryChange?.(nextValue === "__none__" ? null : nextValue)
          }
        >
          <SelectTrigger className={className ?? "h-8 w-44"}>
            <SelectValue placeholder="Select subcategory" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Subcategories</SelectLabel>
              <SelectItem value="__none__">No subcategory</SelectItem>
              {availableSubcategories.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : null}

      {value ? (
        <div className="flex items-center gap-1">
          <Input
            value={newSubcategory}
            onChange={(e) => setNewSubcategory(e.target.value)}
            placeholder="New subcategory"
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSubcategory();
              }
            }}
          />
          <Button size="sm" onClick={handleAddSubcategory} disabled={isPending}>
            Add Sub
          </Button>
        </div>
      ) : null}
    </div>
  );
}

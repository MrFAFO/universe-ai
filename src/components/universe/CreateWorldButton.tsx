"use client";

import { Plus } from "lucide-react";
import { useCreateWorldDialog } from "./CreateWorldProvider";

type CreateWorldButtonVariant = "header" | "sidebar" | "empty";

interface CreateWorldButtonProps {
  variant: CreateWorldButtonVariant;
}

export function CreateWorldButton({ variant }: CreateWorldButtonProps) {
  const { openDialog } = useCreateWorldDialog();

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={openDialog}
        className="hidden items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-accent/90 sm:flex"
      >
        <Plus className="size-[18px]" strokeWidth={2} />
        New World
      </button>
    );
  }

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={openDialog}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface-elevated px-3.5 py-2.5 text-sm font-medium text-text-secondary shadow-[var(--inner-glow)] transition-colors hover:border-accent/25 hover:text-text-primary"
      >
        <Plus className="size-4" strokeWidth={1.75} />
        New World
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openDialog}
      className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-accent/90"
    >
      <Plus className="size-[18px]" strokeWidth={2} />
      Create your first world
    </button>
  );
}

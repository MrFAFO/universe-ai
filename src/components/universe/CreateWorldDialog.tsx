"use client";

import { Loader2, X } from "lucide-react";
import { useActionState, useEffect, useId, useRef } from "react";
import {
  createWorldAction,
  type CreateWorldActionState,
} from "@/server/actions/worlds";

const initialState: CreateWorldActionState = {};

interface CreateWorldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorldDialog({ open, onOpenChange }: CreateWorldDialogProps) {
  const formId = useId();
  const nameId = `${formId}-name`;
  const descriptionId = `${formId}-description`;
  const nameRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState(
    createWorldAction,
    initialState,
  );

  useEffect(() => {
    if (open) {
      nameRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open && !isPending) {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, isPending, onOpenChange]);

  if (!open) {
    return null;
  }

  return (
    <div className="create-world-dialog" role="presentation">
      <button
        type="button"
        className="create-world-dialog__backdrop"
        aria-label="Close create world dialog"
        onClick={() => {
          if (!isPending) onOpenChange(false);
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className="create-world-dialog__panel surface-card"
      >
        <div className="create-world-dialog__header">
          <div>
            <h2
              id={`${formId}-title`}
              className="text-lg font-semibold tracking-tight text-text-primary"
            >
              Create World
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Start a new project with a root planning node.
            </p>
          </div>
          <button
            type="button"
            className="create-world-dialog__close"
            onClick={() => {
              if (!isPending) onOpenChange(false);
            }}
            aria-label="Close"
            disabled={isPending}
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <form action={formAction} className="create-world-dialog__form">
          <div className="create-world-dialog__field">
            <label htmlFor={nameId} className="create-world-dialog__label">
              Name <span className="text-accent">*</span>
            </label>
            <input
              ref={nameRef}
              id={nameId}
              name="name"
              type="text"
              required
              maxLength={200}
              disabled={isPending}
              aria-invalid={Boolean(state.fieldErrors?.name)}
              aria-describedby={
                state.fieldErrors?.name ? `${nameId}-error` : undefined
              }
              className="create-world-dialog__input"
              placeholder="e.g. Product Launch"
            />
            {state.fieldErrors?.name ? (
              <p id={`${nameId}-error`} className="create-world-dialog__error">
                {state.fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div className="create-world-dialog__field">
            <label htmlFor={descriptionId} className="create-world-dialog__label">
              Description
            </label>
            <textarea
              id={descriptionId}
              name="description"
              rows={3}
              maxLength={2000}
              disabled={isPending}
              aria-invalid={Boolean(state.fieldErrors?.description)}
              aria-describedby={
                state.fieldErrors?.description
                  ? `${descriptionId}-error`
                  : undefined
              }
              className="create-world-dialog__textarea"
              placeholder="Optional context for this world"
            />
            {state.fieldErrors?.description ? (
              <p
                id={`${descriptionId}-error`}
                className="create-world-dialog__error"
              >
                {state.fieldErrors.description}
              </p>
            ) : null}
          </div>

          {state.error ? (
            <p className="create-world-dialog__error" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="create-world-dialog__actions">
            <button
              type="button"
              className="create-world-dialog__secondary"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-world-dialog__submit"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
                  Creating…
                </>
              ) : (
                "Create World"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

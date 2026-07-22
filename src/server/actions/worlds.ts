"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createWorldWithRoot } from "@/lib/db/rpc";
import { PUBLIC_CREATE_WORLD_ERROR_MESSAGE } from "@/lib/db/errors";
import {
  createWorldInputSchema,
} from "@/lib/validation/schemas";

export interface CreateWorldActionState {
  error?: string;
  fieldErrors?: {
    name?: string;
    description?: string;
  };
}

function formatFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): CreateWorldActionState["fieldErrors"] {
  const fieldErrors: NonNullable<CreateWorldActionState["fieldErrors"]> = {};

  for (const issue of issues) {
    const field = issue.path[0];
    if (field === "name" && !fieldErrors.name) {
      fieldErrors.name = "World name is required.";
    }
    if (field === "description" && !fieldErrors.description) {
      fieldErrors.description = "Description is too long.";
    }
  }

  return fieldErrors;
}

export async function createWorldAction(
  _prevState: CreateWorldActionState,
  formData: FormData,
): Promise<CreateWorldActionState> {
  const rawInput = {
    name: formData.get("name"),
    description: formData.get("description"),
  };

  const parsed = createWorldInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    const fieldErrors = formatFieldErrors(parsed.error.issues) ?? {};
    return {
      error: fieldErrors.name ?? "Please check the form and try again.",
      fieldErrors,
    };
  }

  let result;
  try {
    result = await createWorldWithRoot(parsed.data);
  } catch {
    return { error: PUBLIC_CREATE_WORLD_ERROR_MESSAGE };
  }

  revalidatePath("/");
  redirect(`/worlds/${result.world_id}`);
}

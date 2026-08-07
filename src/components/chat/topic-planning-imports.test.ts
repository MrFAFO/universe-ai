import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const componentPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "TopicPlanningChat.tsx",
);

const PROHIBITED_MODULE_SPECIFIERS = [
  "@/lib/ai/branch-suggestion",
  "@/lib/ai/branch-suggestion-api",
  "@/lib/ai/branch-suggestions-client",
  "@/lib/ai/structure-assessment",
  "@/lib/chat/root-planning-timeline",
  "@/components/chat/BranchSuggestionCard",
];

describe("TopicPlanningChat import guard", () => {
  it("does not import Branch Suggestion or Root timeline modules", () => {
    const source = readFileSync(componentPath, "utf8");

    for (const specifier of PROHIBITED_MODULE_SPECIFIERS) {
      expect(source).not.toContain(specifier);
    }
  });
});

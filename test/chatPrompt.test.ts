import { describe, expect, it } from "vitest";
import { buildChatPrompt, buildQaChatPrompt } from "@/lib/ai/chatPrompt";
import type { ResumeData } from "@/lib/schema/resume";

// The prompt only serialises the resume, so a stub is enough here.
const resume = { sections: [] } as unknown as ResumeData;

describe("buildChatPrompt source file", () => {
  it("includes an earlier file as reference without treating it as an import", () => {
    const { system, messages } = buildChatPrompt({
      resume,
      history: [],
      message: "You missed my older jobs",
      sourceFileText: "OLD JOB TEXT",
    });
    expect(system).toContain("OLD JOB TEXT");
    expect(system).toContain("NOT a new import");
    expect(system).not.toContain("this is an import");
    expect(messages.at(-1)?.content).toBe("You missed my older jobs");
  });

  it("ignores the earlier file when a new one is attached", () => {
    const { system, messages } = buildChatPrompt({
      resume,
      history: [],
      message: "Here",
      attachedFileText: "NEW FILE",
      sourceFileText: "OLD JOB TEXT",
    });
    expect(system).not.toContain("OLD JOB TEXT");
    expect(system).toContain("this is an import");
    expect(messages.at(-1)?.content).toContain("NEW FILE");
  });

  it("adds nothing when no file was ever attached", () => {
    const { system } = buildChatPrompt({ resume, history: [], message: "Hi" });
    expect(system).not.toContain("Earlier attached file");
  });

  it("puts the stable file text before the resume so the prompt cache can reuse it", () => {
    const { system } = buildChatPrompt({
      resume,
      history: [],
      message: "Fix it",
      sourceFileText: "OLD JOB TEXT",
    });
    expect(system.indexOf("OLD JOB TEXT")).toBeLessThan(
      system.indexOf("Current resume (JSON):"),
    );
  });

  it("gives plain questions the earlier file too", () => {
    const { system } = buildQaChatPrompt({
      resume,
      history: [],
      message: "What did my CV say about Kafka?",
      sourceFileText: "OLD JOB TEXT",
    });
    expect(system).toContain("OLD JOB TEXT");
    expect(system.indexOf("OLD JOB TEXT")).toBeLessThan(
      system.indexOf("Current resume (JSON):"),
    );
  });
});

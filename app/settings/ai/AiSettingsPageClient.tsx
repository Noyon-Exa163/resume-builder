"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Loader2, PlugZap, Trash2 } from "lucide-react";
import {
  Input,
  Button,
  SelectField,
  Badge,
  Skeleton,
  type SelectOption,
} from "@/components/ui";
import type { AIProviderId } from "@/lib/ai/types";
import { templateRegistry } from "@/templates";
import "./page.css";

interface ProviderFormState {
  apiKey: string;
  model: string;
  baseUrl: string;
}

type ProvidersState = Record<AIProviderId, ProviderFormState>;

interface AdminSettingsResponse {
  providers: Partial<
    Record<AIProviderId, { apiKey: string; model?: string; baseUrl?: string }>
  >;
  defaultProviderId?: AIProviderId;
  defaultTemplateId: string;
}

interface TestStatus {
  state: "idle" | "testing" | "ok" | "error";
  message?: string;
}

const PROVIDER_ORDER: AIProviderId[] = [
  "openrouter",
  "gemini",
  "anthropic",
  "deepseek",
  "customOpenAICompatible",
];

const PROVIDER_LABELS: Record<AIProviderId, string> = {
  gemini: "Google Gemini",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
  customOpenAICompatible: "Custom (OpenAI-compatible)",
};

/** One-line, per-provider guidance shown under its Model field. */
const PROVIDER_HINTS: Record<AIProviderId, string> = {
  openrouter:
    "Leave Model empty to let OpenRouter route each request automatically.",
  gemini:
    "Model is required — check Google AI Studio for current model ids (e.g. gemini-2.5-flash).",
  anthropic:
    "Model is required — check Anthropic's docs for current model ids (e.g. claude-sonnet-4-5).",
  deepseek:
    "Model is required — check DeepSeek's docs for current model ids (e.g. deepseek-chat).",
  customOpenAICompatible:
    "Base URL and Model are both required — point this at any OpenAI-compatible chat completions API.",
};

function emptyProviders(): ProvidersState {
  return PROVIDER_ORDER.reduce((acc, id) => {
    acc[id] = { apiKey: "", model: "", baseUrl: "" };
    return acc;
  }, {} as ProvidersState);
}

export default function AiSettingsPageClient() {
  const [providers, setProviders] = useState<ProvidersState>(emptyProviders);
  // Snapshot of what's actually persisted server-side. Per-provider save/
  // remove reads other rows from here (not from `providers`) so saving one
  // row can never accidentally persist some other row's half-typed edits.
  const [savedProviders, setSavedProviders] =
    useState<ProvidersState>(emptyProviders);
  const [defaultProviderId, setDefaultProviderId] = useState<string | null>(
    null,
  );
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [savingProviderId, setSavingProviderId] = useState<AIProviderId | null>(
    null,
  );
  const [dirtyProviders, setDirtyProviders] = useState<Set<AIProviderId>>(
    new Set(),
  );
  const isDirty = dirtyProviders.size > 0;
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultsSavedAt, setDefaultsSavedAt] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [testStatus, setTestStatus] = useState<
    Partial<Record<AIProviderId, TestStatus>>
  >({});

  useEffect(() => {
    let ignore = false;

    fetch("/api/settings")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Could not load AI settings.");
        }
        return res.json();
      })
      .then((data: AdminSettingsResponse) => {
        if (ignore) return;
        const loaded = emptyProviders();
        for (const id of PROVIDER_ORDER) {
          const config = data.providers[id];
          if (config) {
            loaded[id] = {
              apiKey: config.apiKey,
              model: config.model ?? "",
              baseUrl: config.baseUrl ?? "",
            };
          }
        }
        setProviders(loaded);
        setSavedProviders(loaded);
        setDefaultProviderId(data.defaultProviderId ?? null);
        setDefaultTemplateId(data.defaultTemplateId ?? "exabyting");
      })
      .catch((err: Error) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Reloading/closing the tab with an unsaved key typed in (e.g. right after
  // a successful Test Connection, which only tests — it never saves) would
  // otherwise silently discard it. Warn before that happens.
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function updateProvider(
    id: AIProviderId,
    patch: Partial<ProviderFormState>,
  ) {
    setProviders((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setDirtyProviders((prev) => new Set(prev).add(id));
    setTestStatus((prev) => ({ ...prev, [id]: { state: "idle" } }));
  }

  async function handleTestConnection(id: AIProviderId) {
    const config = providers[id];
    setTestStatus((prev) => ({ ...prev, [id]: { state: "testing" } }));
    try {
      const res = await fetch("/api/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: id,
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl.trim() || undefined,
        }),
      });
      const data: { ok: boolean; error?: string } = await res.json();
      setTestStatus((prev) => ({
        ...prev,
        [id]: data.ok
          ? { state: "ok" }
          : { state: "error", message: data.error || "Connection failed." },
      }));
    } catch {
      setTestStatus((prev) => ({
        ...prev,
        [id]: { state: "error", message: "Something went wrong." },
      }));
    }
  }

  // Built from savedProviders (not the live `providers` form state) so this
  // never offers a provider as a default choice that persistDefaults would
  // then silently drop for not having a saved API key yet.
  const configuredProviderOptions: SelectOption[] = PROVIDER_ORDER.filter(
    (id) => savedProviders[id].apiKey.trim(),
  ).map((id) => ({ value: id, label: PROVIDER_LABELS[id] }));

  const templateOptions: SelectOption[] = Object.values(templateRegistry).map(
    (t) => ({ value: t.meta.id, label: t.meta.name }),
  );

  /**
   * Shared "which providers actually have an API key" builder — takes an
   * explicit snapshot rather than always reading `providers`, so a
   * per-provider save/remove can build its payload from `savedProviders`
   * (merged with just the one row being changed) instead of accidentally
   * persisting some other row's in-progress, not-yet-saved edits.
   */
  function buildProvidersPayloadFrom(
    source: ProvidersState,
  ): AdminSettingsResponse["providers"] {
    const payload: AdminSettingsResponse["providers"] = {};
    for (const id of PROVIDER_ORDER) {
      const config = source[id];
      if (!config.apiKey.trim()) continue;
      payload[id] = {
        apiKey: config.apiKey.trim(),
        ...(config.model.trim() ? { model: config.model.trim() } : {}),
        ...(id === "customOpenAICompatible" && config.baseUrl.trim()
          ? { baseUrl: config.baseUrl.trim() }
          : {}),
      };
    }
    return payload;
  }

  /**
   * Keeps an explicit choice if it's still valid; otherwise auto-picks the
   * single configured provider (adding a key without separately choosing it
   * as "default" is an easy step to miss, and pointless when there's only
   * one option) — mirrors the same fallback the ai-parse route applies.
   */
  function resolveDefaultProviderId(
    payload: AdminSettingsResponse["providers"],
    current: AIProviderId | null,
  ): AIProviderId | null {
    if (current && payload[current]) return current;
    const configuredIds = Object.keys(payload) as AIProviderId[];
    return configuredIds.length === 1 ? configuredIds[0] : null;
  }

  async function persistSettings(
    providersPayload: AdminSettingsResponse["providers"],
    nextDefaultProviderId: AIProviderId | null,
    nextDefaultTemplateId: string,
  ): Promise<boolean> {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providers: providersPayload,
        defaultProviderId: nextDefaultProviderId ?? undefined,
        defaultTemplateId: nextDefaultTemplateId,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Could not save settings.");
      return false;
    }
    return true;
  }

  /**
   * Persists default provider / template immediately. Uses last-saved
   * provider rows so picking a dropdown can't leak an unsaved API key.
   */
  async function persistDefaults(
    nextDefaultProviderId: AIProviderId | null,
    nextDefaultTemplateId: string,
  ) {
    setError("");
    setSavingDefaults(true);
    try {
      const payload = buildProvidersPayloadFrom(savedProviders);
      const resolvedDefault = resolveDefaultProviderId(
        payload,
        nextDefaultProviderId,
      );
      const ok = await persistSettings(
        payload,
        resolvedDefault,
        nextDefaultTemplateId,
      );
      if (!ok) return;
      setDefaultProviderId(resolvedDefault);
      setDefaultTemplateId(nextDefaultTemplateId);
      setDefaultsSavedAt(Date.now());
    } catch {
      setError("Something went wrong saving defaults.");
    } finally {
      setSavingDefaults(false);
    }
  }

  /**
   * Saves just one provider's fields — other rows are sent as their last
   * saved values (not whatever's currently typed but unsaved in them), so
   * this can't leak a half-finished edit in a different row.
   */
  async function handleSaveProvider(id: AIProviderId) {
    setError("");
    setSavingProviderId(id);
    try {
      const merged: ProvidersState = { ...savedProviders, [id]: providers[id] };
      const payload = buildProvidersPayloadFrom(merged);
      const resolvedDefault = resolveDefaultProviderId(
        payload,
        defaultProviderId as AIProviderId | null,
      );
      const ok = await persistSettings(
        payload,
        resolvedDefault,
        defaultTemplateId ?? "exabyting",
      );
      if (!ok) return;
      setSavedProviders(merged);
      setDefaultProviderId(resolvedDefault);
      setDirtyProviders((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      setError("Something went wrong saving this provider.");
    } finally {
      setSavingProviderId(null);
    }
  }

  /** Immediately deletes a provider's saved API key/model/base URL. */
  async function handleRemoveProvider(id: AIProviderId) {
    setError("");
    setSavingProviderId(id);
    try {
      const currentDefault =
        defaultProviderId === id
          ? null
          : (defaultProviderId as AIProviderId | null);
      const cleared: ProviderFormState = { apiKey: "", model: "", baseUrl: "" };
      const merged: ProvidersState = { ...savedProviders, [id]: cleared };
      const payload = buildProvidersPayloadFrom(merged);
      const resolvedDefault = resolveDefaultProviderId(payload, currentDefault);
      const ok = await persistSettings(
        payload,
        resolvedDefault,
        defaultTemplateId ?? "exabyting",
      );
      if (!ok) return;
      setProviders((prev) => ({ ...prev, [id]: cleared }));
      setSavedProviders(merged);
      setDirtyProviders((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDefaultProviderId(resolvedDefault);
      setTestStatus((prev) => ({ ...prev, [id]: { state: "idle" } }));
    } catch {
      setError("Something went wrong removing the provider.");
    } finally {
      setSavingProviderId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="ai-settings-page">
        <h1 className="ai-settings-page__title">AI Settings</h1>
        <p className="ai-settings-page__intro">
          Configure the AI providers used for AI-assisted resume import. Keys
          are stored server-side and are never sent to the browser. Test
          Connection only checks a key — click Save on a provider to keep it.
          Default provider and template save as soon as you pick them.
        </p>
        <div className="ai-settings-page__layout">
          <div className="ai-settings-page__providers">
            {PROVIDER_ORDER.map((id) => (
              <div
                key={id}
                className="ai-settings-page__provider ai-settings-page__provider--loading"
              >
                <Skeleton height={20} width="35%" />
                <div className="ai-settings-page__provider-row">
                  <Skeleton height={48} />
                  <Skeleton height={48} />
                </div>
              </div>
            ))}
          </div>
          <aside className="ai-settings-page__defaults" aria-label="Settings">
            <h2 className="ai-settings-page__defaults-title">Settings</h2>
            <Skeleton height={48} />
            <Skeleton height={48} />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-settings-page">
      <h1 className="ai-settings-page__title">AI Settings</h1>
      <p className="ai-settings-page__intro">
        Configure the AI providers used for AI-assisted resume import. Keys
        are stored server-side and are never sent to the browser. Test
        Connection only checks a key — click Save on a provider to keep it.
        Default provider and template save as soon as you pick them.
      </p>

      {error && <div className="ai-settings-page__error">{error}</div>}

      <div className="ai-settings-page__layout">
        <div className="ai-settings-page__providers">
        {PROVIDER_ORDER.map((id) => {
          const config = providers[id];
          const status = testStatus[id];
          const isProviderDirty = dirtyProviders.has(id);
          const isSavingThisProvider = savingProviderId === id;
          return (
            <div key={id} className="ai-settings-page__provider">
              <h2 className="ai-settings-page__provider-title">
                {PROVIDER_LABELS[id]}
              </h2>
              <div className="ai-settings-page__provider-row">
                <Input
                  label="API Key"
                  type="password"
                  size="s"
                  value={config.apiKey}
                  onChange={(e) =>
                    updateProvider(id, { apiKey: e.target.value })
                  }
                  placeholder="sk-…"
                />
                <Input
                  label="Model"
                  size="s"
                  value={config.model}
                  onChange={(e) =>
                    updateProvider(id, { model: e.target.value })
                  }
                  placeholder="e.g. gpt-4o-mini"
                  helperText={PROVIDER_HINTS[id]}
                />
                {id === "customOpenAICompatible" && (
                  <Input
                    label="Base URL"
                    stripWhitespace
                    size="s"
                    value={config.baseUrl}
                    onChange={(e) =>
                      updateProvider(id, { baseUrl: e.target.value })
                    }
                    placeholder="https://api.example.com/v1"
                  />
                )}
              </div>
              <div className="ai-settings-page__provider-footer">
                <div className="ai-settings-page__provider-actions">
                  <Button
                    type="button"
                    variant="primary"
                    size="m"
                    disabled={!config.apiKey.trim() || isSavingThisProvider}
                    onClick={() => void handleSaveProvider(id)}
                  >
                    {isSavingThisProvider ? (
                      <Loader2 size={16} className="button__icon--spin" />
                    ) : (
                      <CircleCheck size={16} />
                    )}
                    {isSavingThisProvider ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="m"
                    disabled={
                      !config.apiKey.trim() ||
                      status?.state === "testing" ||
                      isSavingThisProvider
                    }
                    onClick={() => void handleTestConnection(id)}
                  >
                    {status?.state === "testing" ? (
                      <Loader2 size={16} className="button__icon--spin" />
                    ) : (
                      <PlugZap size={16} />
                    )}
                    {status?.state === "testing"
                      ? "Testing…"
                      : "Test Connection"}
                  </Button>
                  {isProviderDirty && !isSavingThisProvider && (
                    <span className="ai-settings-page__unsaved-label">
                      Unsaved
                    </span>
                  )}
                  {status?.state === "ok" && (
                    <Badge variant="default">Connected</Badge>
                  )}
                  {status?.state === "error" && (
                    <span className="ai-settings-page__provider-error">
                      {status.message}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="tertiary"
                  size="s"
                  disabled={!config.apiKey.trim() || isSavingThisProvider}
                  onClick={() => void handleRemoveProvider(id)}
                >
                  <Trash2 size={14} />
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <aside className="ai-settings-page__defaults" aria-label="Settings">
        <h2 className="ai-settings-page__defaults-title">Settings</h2>
        <SelectField
          label="Default Provider"
          placeholder="Choose a configured provider"
          options={configuredProviderOptions}
          value={defaultProviderId ?? undefined}
          onValueChange={(value) => {
            setDefaultProviderId(value);
            void persistDefaults(
              value as AIProviderId | null,
              defaultTemplateId ?? "exabyting",
            );
          }}
          disabled={configuredProviderOptions.length === 0 || savingDefaults}
          helperText={
            configuredProviderOptions.length === 0
              ? "Add an API key for a provider before choosing a default."
              : "Used for every AI-assisted import — users don't pick a provider themselves."
          }
        />
        <SelectField
          label="Default Template"
          options={templateOptions}
          value={defaultTemplateId ?? undefined}
          onValueChange={(value) => {
            if (!value) return;
            setDefaultTemplateId(value);
            void persistDefaults(
              defaultProviderId as AIProviderId | null,
              value,
            );
          }}
          disabled={savingDefaults}
        />
        {savingDefaults && (
          <span className="ai-settings-page__saved-label">Saving…</span>
        )}
        {!savingDefaults && defaultsSavedAt && (
          <span className="ai-settings-page__saved-label">Saved.</span>
        )}
      </aside>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui";
import "./page.css";

const PROVIDER_COUNT = 5;

/**
 * Route-level fallback for /settings/ai — mirrors the page's real layout
 * (title, intro, a provider card per configured provider, and the defaults
 * aside), matching AiSettingsPageClient's own loading state so the
 * hand-off doesn't reshuffle the page.
 */
export default function AiSettingsLoading() {
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
            {Array.from({ length: PROVIDER_COUNT }, (_, index) => (
              <div
                key={index}
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

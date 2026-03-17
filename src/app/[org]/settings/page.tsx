"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, Eye, EyeOff, CheckCircle2, Key, Building2, Clock } from "lucide-react";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Puerto_Rico",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

interface SettingsData {
  org: { name: string; description: string | null; org_type: string };
  settings: {
    timezone: string;
    openai_api_key: string | null;
    google_client_id: string | null;
    google_client_secret: string | null;
    has_openai_key: boolean;
    has_google_client_id: boolean;
    has_google_client_secret: boolean;
  };
  isAdmin: boolean;
}

function KeyField({
  label,
  hint,
  name,
  value,
  onChange,
  hasSaved,
  readOnly,
}: {
  label: string;
  hint: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  hasSaved: boolean;
  readOnly: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {hasSaved && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>
      <p className="mb-1.5 text-xs text-gray-400">{hint}</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={hasSaved ? "Leave blank to keep existing key" : "Paste your key here"}
            readOnly={readOnly}
            className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm font-mono outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue disabled:bg-gray-50"
          />
          {value && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {hasSaved && value === "" && (
          <button
            type="button"
            onClick={() => onChange("CLEAR")}
            className="text-xs text-red-400 hover:text-red-600 hover:underline whitespace-nowrap"
          >
            Remove key
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const params = useParams();
  const orgSlug = params.org as string;

  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [timezone, setTimezone] = useState("America/New_York");
  const [openaiKey, setOpenaiKey] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");

  useEffect(() => {
    fetch(`/api/settings?orgSlug=${orgSlug}`)
      .then((r) => r.json())
      .then((d: SettingsData) => {
        setData(d);
        setTimezone(d.settings.timezone);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orgSlug]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const body: Record<string, string> = { orgSlug, timezone };
    if (openaiKey) body.openai_api_key = openaiKey === "CLEAR" ? "" : openaiKey;
    if (googleClientId) body.google_client_id = googleClientId === "CLEAR" ? "" : googleClientId;
    if (googleClientSecret) body.google_client_secret = googleClientSecret === "CLEAR" ? "" : googleClientSecret;

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
      } else {
        setSaved(true);
        // Re-fetch to get updated masked values
        const refreshed = await fetch(`/api/settings?orgSlug=${orgSlug}`).then((r) => r.json());
        setData(refreshed);
        setOpenaiKey("");
        setGoogleClientId("");
        setGoogleClientSecret("");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return <div className="py-12 text-center text-sm text-gray-400">Failed to load settings.</div>;
  }

  const isAdmin = data.isAdmin;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-civic-navy">Settings</h1>
        <p className="text-sm text-gray-500">{data.org.name}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">

        {/* Org preferences */}
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-2.5 border-b px-5 py-4">
            <Clock className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Organization Preferences</h2>
          </div>
          <div className="p-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!isAdmin}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue disabled:bg-gray-50 disabled:text-gray-400"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* OpenAI */}
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-2.5 border-b px-5 py-4">
            <Key className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">OpenAI API Key</h2>
          </div>
          <div className="p-5 space-y-2">
            <p className="text-xs text-gray-500">
              Used for AI minutes generation, document summarization, and action item extraction.
              If left blank, the platform default key is used (subject to usage limits).
            </p>
            <KeyField
              label="Secret key"
              hint="Find this at platform.openai.com → API Keys"
              name="openai_api_key"
              value={openaiKey}
              onChange={setOpenaiKey}
              hasSaved={data.settings.has_openai_key}
              readOnly={!isAdmin}
            />
          </div>
        </section>

        {/* Google Calendar */}
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-2.5 border-b px-5 py-4">
            <Building2 className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Google Calendar OAuth App</h2>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-gray-500">
              Your own Google Cloud OAuth credentials for Calendar integration.
              Create a project at{" "}
              <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-civic-blue hover:underline">
                console.cloud.google.com
              </a>{" "}
              → APIs &amp; Services → Credentials → OAuth 2.0 Client ID.
              Set the redirect URI to{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">
                {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/calendar/google/callback
              </code>.
            </p>
            <KeyField
              label="Client ID"
              hint="Ends in .apps.googleusercontent.com"
              name="google_client_id"
              value={googleClientId}
              onChange={setGoogleClientId}
              hasSaved={data.settings.has_google_client_id}
              readOnly={!isAdmin}
            />
            <KeyField
              label="Client Secret"
              hint="The secret paired with your Client ID"
              name="google_client_secret"
              value={googleClientSecret}
              onChange={setGoogleClientSecret}
              hasSaved={data.settings.has_google_client_secret}
              readOnly={!isAdmin}
            />
          </div>
        </section>

        {!isAdmin && (
          <p className="text-center text-sm text-gray-400">
            Only org admins and clerks can change settings.
          </p>
        )}

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        {saved && (
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Settings saved successfully.
          </div>
        )}

        {isAdmin && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-civic-blue px-6 py-2 text-sm font-medium text-white hover:bg-civic-navy disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save settings
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

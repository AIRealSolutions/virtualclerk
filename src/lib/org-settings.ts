import { createClient as createServiceClient } from "@supabase/supabase-js";

interface OrgKeys {
  openai_api_key: string | null;
  google_client_id: string | null;
  google_client_secret: string | null;
  timezone: string;
}

export async function getOrgSettings(organizationId: string): Promise<OrgKeys> {
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await db
    .from("organization_settings")
    .select("openai_api_key, google_client_id, google_client_secret, timezone")
    .eq("organization_id", organizationId)
    .single();

  return {
    openai_api_key: data?.openai_api_key ?? null,
    google_client_id: data?.google_client_id ?? null,
    google_client_secret: data?.google_client_secret ?? null,
    timezone: data?.timezone ?? "America/New_York",
  };
}

export function resolveOpenAIKey(orgKey: string | null): string {
  return orgKey ?? process.env.OPENAI_API_KEY ?? "";
}

export function resolveGoogleClientId(orgKey: string | null): string {
  return orgKey ?? process.env.GOOGLE_CLIENT_ID ?? "";
}

export function resolveGoogleClientSecret(orgKey: string | null): string {
  return orgKey ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
}

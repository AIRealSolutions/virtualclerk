"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const schema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "URL slug must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  org_type: z.enum(["government", "nonprofit", "committee", "business", "personal"]),
  description: z.string().optional(),
});
type OnboardingForm = z.infer<typeof schema>;

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(schema),
    defaultValues: { org_type: "government" },
  });

  async function onSubmit(data: OnboardingForm) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      let json: { error?: string; slug?: string } = {};
      try { json = await res.json(); } catch { /* empty response */ }

      if (!res.ok) {
        setError(json.error ?? `Server error (${res.status})`);
        return;
      }

      router.push(`/${json.slug}/meetings`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-civic-slate px-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-civic-blue" />
          <span className="text-lg font-semibold text-civic-navy">VirtualClerk.ai</span>
        </div>

        <h1 className="mb-1 text-2xl font-bold text-civic-navy">Create your workspace</h1>
        <p className="mb-6 text-sm text-gray-500">
          Set up your organization to get started
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Org name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Organization name
            </label>
            <input
              {...register("name")}
              placeholder="Town of Springfield"
              onChange={(e) => {
                register("name").onChange(e);
                setValue("slug", toSlug(e.target.value));
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Public URL
            </label>
            <div className="flex items-center rounded-md border border-gray-300 focus-within:border-civic-blue focus-within:ring-1 focus-within:ring-civic-blue">
              <span className="select-none rounded-l-md border-r border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                virtualclerk.ai/
              </span>
              <input
                {...register("slug")}
                placeholder="town-of-springfield"
                className="flex-1 rounded-r-md px-3 py-2 text-sm outline-none"
              />
            </div>
            {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug.message}</p>}
          </div>

          {/* Org type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Organization type
            </label>
            <select
              {...register("org_type")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            >
              <option value="government">Local Government</option>
              <option value="nonprofit">Nonprofit</option>
              <option value="committee">Committee / Board</option>
              <option value="business">Business</option>
              <option value="personal">Personal / Family</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="A brief description of your organization"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-civic-blue py-2.5 text-sm font-medium text-white hover:bg-civic-navy disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create workspace
          </button>
        </form>
      </div>
    </div>
  );
}

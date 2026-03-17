"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const schema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});
type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  async function onSubmit(data: RegisterForm) {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // If the session is immediately available (email confirm disabled), go straight to onboarding
    if (authData.session) {
      router.push("/onboarding");
      return;
    }

    // Otherwise prompt the user to check their email
    setCheckEmail(true);
    setLoading(false);
  }

  if (checkEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-civic-slate px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-civic-blue" />
          <h1 className="mb-2 text-xl font-bold text-civic-navy">Check your email</h1>
          <p className="text-sm text-gray-500">
            We sent a confirmation link to your email address. Click it to activate your account and set up your workspace.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm text-civic-blue hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-civic-slate px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-civic-blue" />
          <span className="text-lg font-semibold text-civic-navy">VirtualClerk.ai</span>
        </div>

        <h1 className="mb-1 text-2xl font-bold text-civic-navy">Create your account</h1>
        <p className="mb-6 text-sm text-gray-500">
          Start your free workspace in seconds
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Full name</label>
            <input
              {...register("full_name")}
              placeholder="Jane Smith"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
            {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              {...register("email")}
              type="email"
              placeholder="you@organization.gov"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirm password</label>
            <input
              {...register("confirm_password")}
              type="password"
              placeholder="••••••••"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
            {errors.confirm_password && <p className="mt-1 text-xs text-red-500">{errors.confirm_password.message}</p>}
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
            Create account
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-civic-teal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

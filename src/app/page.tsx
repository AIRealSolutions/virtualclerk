import Link from "next/link";
import { ArrowRight, Building2, FileText, Users, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-civic-blue" />
            <span className="text-lg font-semibold text-civic-navy">
              VirtualClerk.ai
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-civic-blue px-4 py-2 text-sm font-medium text-white hover:bg-civic-navy"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-civic-slate px-4 py-1.5 text-sm text-civic-blue">
            <Zap className="h-4 w-4" />
            AI-powered civic records management
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-civic-navy">
            Your Digital Clerk,{" "}
            <span className="text-civic-teal">Always on Duty</span>
          </h1>
          <p className="mb-10 text-xl text-gray-600">
            VirtualClerk.ai automates meetings, agendas, minutes, votes, and
            records — so your team can focus on governing, not paperwork.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-md bg-civic-blue px-6 py-3 font-medium text-white hover:bg-civic-navy"
            >
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="rounded-md border border-gray-200 px-6 py-3 font-medium text-gray-700 hover:border-gray-300"
            >
              See features
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="bg-civic-slate py-20"
      >
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-civic-navy">
            Everything your clerk does — automated
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-gray-200 bg-white p-6"
              >
                <f.icon className="mb-4 h-8 w-8 text-civic-teal" />
                <h3 className="mb-2 font-semibold text-civic-navy">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} VirtualClerk.ai — All rights reserved
      </footer>
    </div>
  );
}

const features = [
  {
    icon: FileText,
    title: "Meeting & Agenda Management",
    description:
      "Build agendas, attach documents, and publish meeting packets automatically.",
  },
  {
    icon: Users,
    title: "Committee Workflows",
    description:
      "Manage multiple committees with member rosters, motions, and vote tracking.",
  },
  {
    icon: Zap,
    title: "AI Minutes Generator",
    description:
      "Generate draft minutes from your agenda and notes with one click.",
  },
  {
    icon: Building2,
    title: "Public Transparency Portal",
    description:
      "Automatically publish approved records to your public-facing portal.",
  },
  {
    icon: FileText,
    title: "Document Library",
    description:
      "Searchable, tagged, versioned document storage with access controls.",
  },
  {
    icon: Users,
    title: "Action Item Tracker",
    description:
      "Automatically extract tasks from meeting notes and assign them to members.",
  },
];

import Link from "next/link";
import { Building2, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#F8FAFC" }}>
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <p className="text-5xl font-bold text-gray-900">404</p>
        <h1 className="text-lg font-semibold text-gray-800 mt-3">Page not found</h1>
        <p className="text-sm text-gray-500 mt-1.5">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-transform hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a space",
};

export default function PublicBookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}

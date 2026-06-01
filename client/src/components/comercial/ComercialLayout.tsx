import Header from "@/components/Header";
import type { ReactNode } from "react";

export function ComercialLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <main className="relative min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[100rem] px-3 py-4 sm:px-5 sm:py-6 md:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}

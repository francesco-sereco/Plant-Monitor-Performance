import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Plant Monitor Performance",
  description: "Archivio e analisi parametri chimici impianti trattamento acqua",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

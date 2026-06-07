import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas Lavage - lavage auto a domicile a Marrakech",
  description:
    "Atlas Lavage, service de lavage auto professionnel a domicile a Marrakech.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

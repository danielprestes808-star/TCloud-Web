import type { Metadata, Viewport } from "next";
import "../styles/tcloud-design-system.css";
import "./globals.css";
import TCloudThemeBootstrap from "@/components/TCloudThemeBootstrap";
import TCloudPwaBootstrap from "@/components/TCloudPwaBootstrap";

export const metadata: Metadata = {
  title: "TCloud",
  description: "Seus arquivos, em todos os seus dispositivos.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#2f81f7" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body><TCloudThemeBootstrap /><TCloudPwaBootstrap />
        {children}</body>
    </html>
  );
}

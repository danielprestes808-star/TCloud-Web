import type { Metadata } from "next";
import "../styles/tcloud-design-system.css";
import "./globals.css";
import { TCloudLiveRefresh } from "@/components/TCloudLiveRefresh";
import TCloudThemeBootstrap from "@/components/TCloudThemeBootstrap";

import TCloudSettingsLauncher from "@/components/TCloudSettingsLauncher";
export const metadata: Metadata = {
  title: "TCloud",
  description: "Seus arquivos, em todos os seus dispositivos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body><TCloudThemeBootstrap />
        <TCloudLiveRefresh />{children}<TCloudSettingsLauncher /></body>
    </html>
  );
}
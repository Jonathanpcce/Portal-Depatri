import "./globals.css";
import AppShell from "@/components/AppShell";
import AssistantDrawer from "@/components/AssistantDrawer";

export const metadata = {
  title: "SIAI DEPATRI",
  description: "Sistema Inteligente de Apoio à Investigação"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body><AppShell>{children}</AppShell><AssistantDrawer/></body></html>;
}

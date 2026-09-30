"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Search, FileText, Mail, Database, BrainCircuit,
  PanelLeftClose, PanelLeftOpen, Sun, Moon, Files, ClipboardList, ShieldCheck
} from "lucide-react";

const groups = [
  {
    label: "Investigação",
    items: [
      { href: "/", label: "Visão geral", icon: LayoutDashboard },
      { href: "/casos", label: "Casos", icon: Files },
      { href: "/investigacao", label: "Auxiliar de Investigação", icon: BrainCircuit },
      { href: "/base", label: "Base Investigativa", icon: Database }
    ]
  },
  {
    label: "Produção",
    items: [
      { href: "/rt", label: "Relatório Técnico", icon: FileText },
      { href: "/oficios", label: "Ofícios", icon: Mail },
      { href: "/kanban", label: "Kanban", icon: FolderKanban }
    ]
  }
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light"|"dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("siai-theme") as "light"|"dark"|null;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("siai-theme", theme);
  }, [theme]);

  const title = useMemo(() => {
    const all = groups.flatMap(g => g.items);
    return all.find(i => i.href === path)?.label || "SIAI DEPATRI";
  }, [path]);

  return (
    <div className={"app-shell " + (collapsed ? "collapsed" : "")}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SI</div>
          <div className="brand-copy"><strong>SIAI DEPATRI</strong><span>Inteligência Investigativa</span></div>
        </div>
        {groups.map(group => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map(item => {
              const Icon = item.icon;
              const active = path === item.href;
              return <Link className={"nav-item " + (active ? "active" : "")} href={item.href} key={item.href}>
                <Icon size={20}/><span>{item.label}</span>
              </Link>;
            })}
          </div>
        ))}
        <div className="sidebar-footer">
          <div className="nav-item"><ShieldCheck size={20}/><span>Ambiente institucional</span></div>
          <button className="collapse-btn" onClick={() => setCollapsed(v => !v)}>
            {collapsed ? <PanelLeftOpen size={20}/> : <PanelLeftClose size={20}/>}<span>Recolher menu</span>
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-actions">
            <button className="icon-btn" title="Alternar tema" onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
              {theme === "light" ? <Moon size={19}/> : <Sun size={19}/>}
            </button>
          </div>
        </header>
        <div className="main-content">{children}</div>
      </main>
      <button className="chat-fab" onClick={() => window.dispatchEvent(new Event("open-siai-chat"))}>
        <BrainCircuit size={18}/> Assistente IA
      </button>
    </div>
  );
}

import { ReactNode } from "react";
import { HomeIcon } from "@/components/icons";

export type TabId = "home" | "today" | "weekly" | "tasks";

type NavBarProps = {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
};

type TabConfig = {
  id: TabId;
  icon: ReactNode;
  label: string;
};

// TODO: 他のアイコンもSVGに差し替え予定
const tabs: TabConfig[] = [
  { id: "home", icon: <HomeIcon size={24} />, label: "ホーム" },
  { id: "today", icon: <span>✓</span>, label: "今日" },
  { id: "weekly", icon: <span>📈</span>, label: "週次" },
  { id: "tasks", icon: <span>☰</span>, label: "タスク" },
];

export function NavBar({ currentTab, onTabChange }: NavBarProps) {
  return (
    <nav className="navbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`navbar-tab ${currentTab === tab.id ? "navbar-tab-active" : ""}`}
        >
          <span className="navbar-icon">{tab.icon}</span>
          <span className="navbar-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

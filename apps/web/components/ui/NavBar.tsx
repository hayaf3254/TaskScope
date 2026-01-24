import { ReactNode } from "react";
import { HomeIcon, CheckIcon, TrendUpIcon, ListIcon } from "@/components/icons";

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

const tabs: TabConfig[] = [
  { id: "home", icon: <HomeIcon size={24} />, label: "ホーム" },
  { id: "today", icon: <CheckIcon size={24} />, label: "今日" },
  { id: "weekly", icon: <TrendUpIcon size={24} />, label: "週次" },
  { id: "tasks", icon: <ListIcon size={24} />, label: "タスク" },
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

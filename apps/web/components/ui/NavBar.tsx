export type TabId = "home" | "today" | "weekly" | "tasks";

type NavBarProps = {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
};

const tabs: { id: TabId; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "ホーム" },
  { id: "today", icon: "✓", label: "今日" },
  { id: "weekly", icon: "📈", label: "週次" },
  { id: "tasks", icon: "☰", label: "タスク" },
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

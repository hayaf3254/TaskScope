"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { NavBar, TabId } from "@/components/ui/NavBar";
import { getStampStatus, postStamp, logout } from "@/lib/api";
import { getLogicalDate } from "@/lib/date";

// 日付を「YYYY-MM-DD (曜日)」形式にフォーマット
function formatDateWithDay(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dayOfWeek = days[date.getDay()];
  return `${dateStr} (${dayOfWeek})`;
}

export function StampScreen() {
  const router = useRouter();
  const [stamped, setStamped] = useState(false);
  const [streakCurrent, setStreakCurrent] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pressing, setPressing] = useState(false);

  const today = getLogicalDate();

  // 初期ロード: 今日のスタンプ状態を取得
  useEffect(() => {
    async function fetchStatus() {
      const { data, error } = await getStampStatus(today);
      if (data && !error) {
        setStamped(data.stamped);
        setStreakCurrent(data.streak_current);
        setStreakBest(data.streak_best);
      }
      setLoading(false);
    }
    fetchStatus();
  }, [today]);

  // スタンプを押す
  async function handleStamp() {
    if (stamped || pressing) return;

    setPressing(true);
    const { data, error } = await postStamp(today);

    if (data && !error) {
      setStamped(true);
      setStreakCurrent(data.streak_current);
      setStreakBest(data.streak_best);
    }
    setPressing(false);
  }

  // 今日のタスクへ遷移
  function handleGoToTask() {
    router.push("/today");
  }

  // ログアウト
  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  // タブ切り替え
  function handleTabChange(tab: TabId) {
    const routes: Record<TabId, string> = {
      home: "/stamp",
      today: "/today",
      weekly: "/weekly",
      tasks: "/tasks",
    };
    router.push(routes[tab]);
  }

  if (loading) {
    return (
      <div className="stamp-bg flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="stamp-bg">
      {/* ヘッダー */}
      <div className="stamp-header">
        <div className="flex items-start justify-between">
          <div>
            <h1>おかえりなさい!</h1>
            <p>{formatDateWithDay(today)}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 mt-1"
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* メインカード */}
      <div className="stamp-card">
        {/* スタンプボタン */}
        <button
          onClick={handleStamp}
          disabled={stamped || pressing}
          className="stamp-button"
        >
          {stamped ? (
            <Check size={64} color="#1a1a1a" strokeWidth={4} />
          ) : (
            <span className="stamp-button-icon">📌</span>
          )}
        </button>

        {/* ラベル */}
        <p className={`stamp-label ${stamped ? "stamp-label-done" : ""}`}>
          {stamped ? "今日のスタンプ完了!" : "スタンプを押す"}
        </p>

        {/* ストリーク表示 */}
        <div className="stamp-streak">
          <span className="stamp-button-icon">🔥</span>
          <span className="stamp-streak-number">{streakCurrent}日連続</span>
        </div>
        <p className="stamp-best">ベスト: {streakBest}日</p>
      </div>

      {/* アクションボタン */}
      <div className="stamp-action">
        <PrimaryButton onClick={handleGoToTask}>
          今日のタスクへ
        </PrimaryButton>
      </div>

      {/* フッター分の余白 */}
      <div className="h-20" />

      {/* ナビゲーションバー */}
      <NavBar currentTab="home" onTabChange={handleTabChange} />
    </div>
  );
}

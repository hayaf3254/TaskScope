"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavBar, TabId } from "@/components/ui/NavBar";
import { WeeklyGoalModal } from "@/components/ui/WeeklyGoalModal";
import { WeeklyChart } from "./WeeklyChart";
import { getWeekly, updateSettings, WeeklyResponse } from "@/lib/api";
import { getLogicalWeekStart } from "@/lib/date";

// 日付を「YYYY-MM-DD (曜日)」形式にフォーマット
function formatDateWithDay(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dayOfWeek = days[date.getDay()];
  return `${dateStr} (${dayOfWeek})`;
}

export function WeeklyScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyResponse | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);

  useEffect(() => {
    async function fetchWeekly() {
      const weekStart = getLogicalWeekStart();
      const { data, error } = await getWeekly(weekStart);
      if (data && !error) {
        setWeeklyData(data);
      }
      setLoading(false);
    }
    fetchWeekly();
  }, []);

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

  // 目標変更ボタン
  function handleChangeTarget() {
    setShowGoalModal(true);
  }

  // 目標保存
  async function handleSaveGoal(goal: number | null) {
    const { data, error } = await updateSettings(goal);
    if (data && !error) {
      // 成功: ローカル更新
      if (weeklyData) {
        setWeeklyData({ ...weeklyData, target_percent: data.settings.weekly_target_percent ?? null });
      }
    } else {
      // TODO: エラー表示
      console.error("Failed to save goal:", error);
    }
    setShowGoalModal(false);
  }

  if (loading) {
    return (
      <div className="weekly-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const isTargetMet =
    weeklyData?.target_percent !== null &&
    weeklyData?.weekly_average !== undefined &&
    weeklyData.weekly_average >= (weeklyData.target_percent ?? 0);

  return (
    <div className="weekly-screen">
      {/* ヘッダー */}
      <div className="weekly-header">
        <h1>週次</h1>
        {weeklyData && (
          <p>
            {formatDateWithDay(weeklyData.week_start)} 〜{" "}
            {formatDateWithDay(weeklyData.week_end)}
          </p>
        )}
      </div>

      {/* グラフエリア */}
      <div className="weekly-chart-card">
        {weeklyData && <WeeklyChart days={weeklyData.days} />}
      </div>

      {/* 統計カード */}
      <div className="weekly-stats">
        {/* 週平均 */}
        <div className="weekly-stat-card">
          <p className="weekly-stat-label">週平均</p>
          <p className="weekly-stat-value">{weeklyData?.weekly_average ?? 0}%</p>
        </div>

        {/* 目標 */}
        <div className="weekly-stat-card">
          <p className="weekly-stat-label">目標</p>
          <div className="weekly-stat-row">
            <p className="weekly-stat-value">
              {weeklyData?.target_percent ?? "-"}
              {weeklyData?.target_percent !== null && "%"}
            </p>
            {weeklyData?.target_percent !== null && (
              <span
                className={`weekly-badge ${
                  isTargetMet ? "weekly-badge-success" : "weekly-badge-warning"
                }`}
              >
                {isTargetMet ? "達成" : "未達"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 目標変更ボタン */}
      <div className="weekly-action">
        <button onClick={handleChangeTarget} className="weekly-action-button">
          目標を変更
        </button>
      </div>

      {/* ナビゲーションバー */}
      <NavBar currentTab="weekly" onTabChange={handleTabChange} />

      {/* 目標設定モーダル */}
      <WeeklyGoalModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        currentGoal={weeklyData?.target_percent ?? null}
        onSave={handleSaveGoal}
      />
    </div>
  );
}

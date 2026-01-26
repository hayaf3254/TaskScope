"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavBar, TabId } from "@/components/ui/NavBar";
import { WeeklyChart } from "./WeeklyChart";
import { getWeekly, WeeklyResponse } from "@/lib/api";

// 今週の月曜日を取得
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  // 日曜(0)の場合は-6、それ以外は1-dayで月曜に戻る
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

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

  useEffect(() => {
    async function fetchWeekly() {
      const weekStart = getWeekStart();
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
    console.log("目標を変更 clicked");
    // TODO: モーダル実装
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pb-20">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const isTargetMet =
    weeklyData?.target_percent !== null &&
    weeklyData?.weekly_average !== undefined &&
    weeklyData.weekly_average >= (weeklyData.target_percent ?? 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* ヘッダー */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">週次</h1>
        {weeklyData && (
          <p className="text-sm text-gray-500">
            {formatDateWithDay(weeklyData.week_start)} 〜{" "}
            {formatDateWithDay(weeklyData.week_end)}
          </p>
        )}
      </div>

      {/* グラフエリア */}
      <div className="px-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          {weeklyData && <WeeklyChart days={weeklyData.days} />}
        </div>
      </div>

      {/* 統計カード */}
      <div className="px-6 mt-4 grid grid-cols-2 gap-3">
        {/* 週平均 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">週平均</p>
          <p className="text-3xl font-bold text-gray-900">
            {weeklyData?.weekly_average ?? 0}%
          </p>
        </div>

        {/* 目標 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">目標</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-gray-900">
              {weeklyData?.target_percent ?? "-"}
              {weeklyData?.target_percent !== null && "%"}
            </p>
            {weeklyData?.target_percent !== null && (
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  isTargetMet
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {isTargetMet ? "達成" : "未達"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 目標変更ボタン */}
      <div className="px-6 mt-4">
        <button
          onClick={handleChangeTarget}
          className="w-full py-3 border-2 border-blue-500 text-blue-500 font-semibold rounded-xl bg-white hover:bg-blue-50 transition-colors"
        >
          目標を変更
        </button>
      </div>

      {/* ナビゲーションバー */}
      <NavBar currentTab="weekly" onTabChange={handleTabChange} />
    </div>
  );
}

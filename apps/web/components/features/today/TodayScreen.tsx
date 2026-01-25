"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { NavBar, TabId } from "@/components/ui/NavBar";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { getDaily, postDailyCheck, DailyTask } from "@/lib/api";

// 今日の日付をYYYY-MM-DD形式で取得
function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

// 日付を「YYYY-MM-DD (曜日)」形式にフォーマット
function formatDateWithDay(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dayOfWeek = days[date.getDay()];
  return `${dateStr} (${dayOfWeek})`;
}

type TaskProgress = {
  percent: number;
};

export function TodayScreen() {
  const router = useRouter();
  const today = getTodayString();

  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [taskProgress, setTaskProgress] = useState<Record<string, TaskProgress>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNoTaskDay, setIsNoTaskDay] = useState(false);

  // 日次達成率を計算
  const calculateDailyPercent = useCallback(() => {
    if (tasks.length === 0) return 0;
    const denominator = tasks.reduce((sum, t) => sum + t.weight, 0);
    if (denominator === 0) return 0;
    const numerator = tasks.reduce((sum, t) => {
      const progress = taskProgress[t.taskId] || { percent: 0 };
      return sum + (t.weight * progress.percent) / 100;
    }, 0);
    return Math.round((numerator / denominator) * 100);
  }, [tasks, taskProgress]);

  // 重み付き進捗の計算 (例: 1.5 / 8)
  const calculateWeightedProgress = useCallback(() => {
    const denominator = tasks.reduce((sum, t) => sum + t.weight, 0);
    const numerator = tasks.reduce((sum, t) => {
      const progress = taskProgress[t.taskId] || { percent: 0 };
      return sum + (t.weight * progress.percent) / 100;
    }, 0);
    return { numerator: numerator.toFixed(1), denominator };
  }, [tasks, taskProgress]);

  // 初期ロード
  useEffect(() => {
    async function fetchDaily() {
      const { data, error } = await getDaily(today);
      if (data && !error) {
        setTasks(data.tasks);
        setIsNoTaskDay(data.is_no_task_day);
        // 既存の達成度をセット
        const progress: Record<string, TaskProgress> = {};
        for (const task of data.tasks) {
          progress[task.taskId] = { percent: task.achievement_percent };
        }
        setTaskProgress(progress);
      }
      setLoading(false);
    }
    fetchDaily();
  }, [today]);

  // スライダー変更
  function handleSliderChange(taskId: string, percent: number) {
    setTaskProgress((prev) => ({
      ...prev,
      [taskId]: { percent },
    }));
  }

  // チェックボックス変更 (100% or 0%)
  function handleCheckChange(taskId: string, checked: boolean) {
    setTaskProgress((prev) => ({
      ...prev,
      [taskId]: { percent: checked ? 100 : 0 },
    }));
  }

  // 保存
  async function handleSave() {
    if (saving) return;
    setSaving(true);

    const taskAchievements = tasks.map((t) => ({
      taskId: t.taskId,
      percent: taskProgress[t.taskId]?.percent ?? 0,
    }));

    const { error } = await postDailyCheck(today, taskAchievements);

    if (error) {
      // TASK_SET_MISMATCH の場合は再取得
      if (error.code === "TASK_SET_MISMATCH") {
        const { data } = await getDaily(today);
        if (data) {
          setTasks(data.tasks);
          const progress: Record<string, TaskProgress> = {};
          for (const task of data.tasks) {
            progress[task.taskId] = { percent: task.achievement_percent };
          }
          setTaskProgress(progress);
        }
      }
      // TODO: エラー表示
    }

    setSaving(false);
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

  // スライダーの背景グラデーション
  function getSliderBackground(percent: number): string {
    return `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${percent}%, #E5E7EB ${percent}%, #E5E7EB 100%)`;
  }

  if (loading) {
    return (
      <div className="today-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const dailyPercent = calculateDailyPercent();
  const { numerator, denominator } = calculateWeightedProgress();

  return (
    <div className="today-screen">
      {/* ヘッダー */}
      <div className="today-header">
        <h1>今日</h1>
        <p>{formatDateWithDay(today)}</p>
      </div>

      {/* 達成率カード */}
      <div className="today-progress-card">
        <p className="today-progress-label">日次達成率</p>
        <p className="today-progress-percent">{dailyPercent}%</p>
        <p className="today-progress-detail">
          {numerator} / {denominator}
        </p>
      </div>

      {/* タスク一覧 */}
      <div className="today-task-section">
        <h2>タスク一覧</h2>

        {isNoTaskDay || tasks.length === 0 ? (
          <div className="today-empty">
            <p>タスクが登録されていません</p>
            <button onClick={() => router.push("/tasks")}>タスクを追加</button>
          </div>
        ) : (
          <div>
            {tasks.map((task) => {
              const progress = taskProgress[task.taskId] || { percent: 0 };
              return (
                <div key={task.taskId} className="today-task-card">
                  {/* タスクヘッダー */}
                  <div className="today-task-header">
                    <input
                      type="checkbox"
                      checked={progress.percent === 100}
                      onChange={(e) => handleCheckChange(task.taskId, e.target.checked)}
                      className="today-task-checkbox"
                    />
                    <span className="today-task-title">{task.title}</span>
                    <span className="today-task-weight">{task.weight}</span>
                  </div>

                  {/* スライダー */}
                  <div className="today-slider-container">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress.percent}
                      onChange={(e) => handleSliderChange(task.taskId, parseInt(e.target.value))}
                      className="today-slider"
                      style={{ background: getSliderBackground(progress.percent) }}
                    />
                    <span className="today-slider-percent">{progress.percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 保存ボタン */}
      {tasks.length > 0 && (
        <div className="today-save-area">
          <div>
            <PrimaryButton onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* ナビゲーションバー */}
      <NavBar currentTab="today" onTabChange={handleTabChange} />
    </div>
  );
}

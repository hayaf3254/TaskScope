"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavBar, TabId } from "@/components/ui/NavBar";
import { TaskCard } from "@/components/ui/TaskCard";
import { getTasks, deleteTask, Task } from "@/lib/api";

export function TaskManagementScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // 初期ロード
  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await getTasks("all");
      if (data && !error) {
        // archived_at が null のものだけ表示（論理削除されていないもの）
        setTasks(data.tasks.filter((t) => t.archived_at === null));
      }
      setLoading(false);
    }
    fetchTasks();
  }, []);

  // タスク追加（モーダル実装は後で）
  function handleAdd() {
    console.log("追加ボタン押下");
    // TODO: モーダル実装
  }

  // タスク編集（モーダル実装は後で）
  function handleEdit(taskId: string) {
    console.log("編集ボタン押下:", taskId);
    // TODO: モーダル実装
  }

  // タスク削除
  async function handleDelete(taskId: string) {
    if (!confirm("このタスクを削除しますか？")) return;

    const { error } = await deleteTask(taskId);
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
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
      <div className="tasks-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="tasks-screen">
      {/* ヘッダー */}
      <div className="tasks-header">
        <h1>タスク管理</h1>
        <button className="tasks-add-button" onClick={handleAdd}>
          ＋追加
        </button>
      </div>

      {/* タスク一覧 */}
      {tasks.length === 0 ? (
        <div className="tasks-empty">
          <p>タスクが登録されていません</p>
          <button onClick={handleAdd}>タスクを追加</button>
        </div>
      ) : (
        <div className="tasks-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              title={task.title}
              weight={task.weight}
              isActive={task.is_active}
              onEdit={() => handleEdit(task.id)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </div>
      )}

      {/* ナビゲーションバー */}
      <NavBar currentTab="tasks" onTabChange={handleTabChange} />
    </div>
  );
}

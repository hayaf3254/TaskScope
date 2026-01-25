"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavBar, TabId } from "@/components/ui/NavBar";
import { TaskCard } from "@/components/ui/TaskCard";
import { TaskModal } from "@/components/ui/TaskModal";
import { getTasks, createTask, updateTask, deleteTask, Task } from "@/lib/api";

export function TaskManagementScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // モーダル状態
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

  // タスク追加モーダルを開く
  function handleAdd() {
    setModalMode("add");
    setEditingTask(null);
    setModalOpen(true);
  }

  // タスク編集モーダルを開く
  function handleEdit(task: Task) {
    setModalMode("edit");
    setEditingTask(task);
    setModalOpen(true);
  }

  // モーダルを閉じる
  function handleCloseModal() {
    setModalOpen(false);
    setEditingTask(null);
  }

  // 保存処理（追加 or 編集）
  async function handleSave(title: string, weight: number, isActive: boolean) {
    if (modalMode === "add") {
      const { data, error } = await createTask(title, weight, isActive);
      if (data && !error) {
        setTasks((prev) => [...prev, data.task]);
      }
    } else if (modalMode === "edit" && editingTask) {
      const { data, error } = await updateTask(editingTask.id, {
        title,
        weight,
        is_active: isActive,
      });
      if (data && !error) {
        setTasks((prev) =>
          prev.map((t) => (t.id === editingTask.id ? data.task : t))
        );
      }
    }
    handleCloseModal();
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
              onEdit={() => handleEdit(task)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </div>
      )}

      {/* モーダル */}
      <TaskModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        mode={modalMode}
        initialData={
          editingTask
            ? {
                title: editingTask.title,
                weight: editingTask.weight,
                isActive: editingTask.is_active,
              }
            : undefined
        }
      />

      {/* ナビゲーションバー */}
      <NavBar currentTab="tasks" onTabChange={handleTabChange} />
    </div>
  );
}

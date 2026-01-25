"use client";

import { useState, useEffect } from "react";

type TaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, weight: number, isActive: boolean) => void;
  mode: "add" | "edit";
  initialData?: {
    title: string;
    weight: number;
    isActive: boolean;
  };
};

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  mode,
  initialData,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [weight, setWeight] = useState(3);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // 初期値セット
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialData) {
        setTitle(initialData.title);
        setWeight(initialData.weight);
        setIsActive(initialData.isActive);
      } else {
        setTitle("");
        setWeight(3);
        setIsActive(true);
      }
    }
  }, [isOpen, mode, initialData]);

  // 保存処理
  async function handleSave() {
    if (!title.trim() || saving) return;
    setSaving(true);
    await onSave(title.trim(), weight, isActive);
    setSaving(false);
  }

  // オーバーレイクリックで閉じる
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container">
        {/* タイトル */}
        <h2 className="modal-title">
          {mode === "add" ? "新規タスク追加" : "タスク編集"}
        </h2>

        {/* タスク名 */}
        <div className="modal-field">
          <label className="modal-label">タスク名</label>
          <input
            type="text"
            className="modal-input"
            placeholder="例：英語学習"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* weight */}
        <div className="modal-field">
          <label className="modal-label">weight(重み)</label>
          <input
            type="number"
            className="modal-input"
            min={1}
            max={10}
            value={weight}
            onChange={(e) => setWeight(parseInt(e.target.value) || 1)}
          />
        </div>

        {/* 有効トグル */}
        <div className="modal-toggle-row">
          <span className="modal-toggle-label">有効</span>
          <button
            type="button"
            className={`toggle-switch ${isActive ? "active" : ""}`}
            onClick={() => setIsActive(!isActive)}
          >
            <span className="toggle-switch-thumb" />
          </button>
        </div>

        {/* ボタン */}
        <div className="modal-actions">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="modal-btn modal-btn-save"
            onClick={handleSave}
            disabled={!title.trim() || saving}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

type WeeklyGoalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentGoal: number | null;
  onSave: (goal: number | null) => void;
};

export function WeeklyGoalModal({
  isOpen,
  onClose,
  currentGoal,
  onSave,
}: WeeklyGoalModalProps) {
  const [goalValue, setGoalValue] = useState("");
  const [saving, setSaving] = useState(false);

  // 初期値セット
  useEffect(() => {
    if (isOpen) {
      setGoalValue(currentGoal !== null ? String(currentGoal) : "");
    }
  }, [isOpen, currentGoal]);

  // 保存処理
  async function handleSave() {
    if (saving) return;
    setSaving(true);

    const trimmed = goalValue.trim();
    if (trimmed === "") {
      await onSave(null);
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        await onSave(num);
      }
    }

    setSaving(false);
  }

  // オーバーレイクリックで閉じる
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  // 入力値の検証（0-100の数値のみ許可）
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (value === "" || /^\d{1,3}$/.test(value)) {
      const num = parseInt(value, 10);
      if (value === "" || (num >= 0 && num <= 100)) {
        setGoalValue(value);
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container">
        {/* タイトル */}
        <h2 className="modal-title">週目標を設定</h2>

        {/* 目標達成率 */}
        <div className="modal-field">
          <label className="modal-label">目標達成率（%）</label>
          <input
            type="number"
            className="modal-input"
            placeholder="70"
            min={0}
            max={100}
            value={goalValue}
            onChange={handleInputChange}
          />
          <p className="text-xs text-gray-500 mt-2">
            空欄にすると目標なしになります
          </p>
        </div>

        {/* ボタン */}
        <div className="modal-actions">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="modal-btn modal-btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

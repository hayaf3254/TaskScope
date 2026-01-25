import { ReactNode } from "react";

type TaskCardProps = {
  title: string;
  weight: number;
  isActive: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  children?: ReactNode;
};

export function TaskCard({
  title,
  weight,
  isActive,
  onEdit,
  onDelete,
  children,
}: TaskCardProps) {
  return (
    <div className="task-card">
      {/* ヘッダー部分 */}
      <div className="task-card-header">
        <p className="task-card-title">{title}</p>
        <div className="task-card-meta">
          <span className="task-card-weight">weight: {weight}</span>
          <span
            className={`task-badge ${
              isActive ? "task-badge-active" : "task-badge-inactive"
            }`}
          >
            {isActive ? "有効" : "無効"}
          </span>
        </div>
      </div>

      {/* 子要素（スライダーなど） */}
      {children}

      {/* アクションボタン */}
      {(onEdit || onDelete) && (
        <div className="task-card-actions">
          {onEdit && (
            <button className="task-btn task-btn-edit" onClick={onEdit}>
              編集
            </button>
          )}
          {onDelete && (
            <button className="task-btn task-btn-delete" onClick={onDelete}>
              削除
            </button>
          )}
        </div>
      )}
    </div>
  );
}

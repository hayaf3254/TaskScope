// 27:59ルール: 0:00〜3:59 は前日扱い、4:00 から新しい日
const LOGICAL_DAY_BOUNDARY_HOUR = 4;

// 論理日付を YYYY-MM-DD 形式で返す
export function getLogicalDate(): string {
  const now = new Date();
  if (now.getHours() < LOGICAL_DAY_BOUNDARY_HOUR) {
    now.setDate(now.getDate() - 1);
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 論理日付ベースで今週月曜日を YYYY-MM-DD 形式で返す
export function getLogicalWeekStart(): string {
  const now = new Date();
  if (now.getHours() < LOGICAL_DAY_BOUNDARY_HOUR) {
    now.setDate(now.getDate() - 1);
  }
  const day = now.getDay();
  // 日曜(0)の場合は-6、それ以外は1-dayで月曜に戻る
  const diff = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diff);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

type DayData = {
  date: string;
  daily_percent: number | null;
  is_no_task_day: boolean;
};

type WeeklyChartProps = {
  days: DayData[];
};

// 曜日を取得
function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days[date.getDay()];
}

export function WeeklyChart({ days }: WeeklyChartProps) {
  // グラフ用データに変換
  const chartData = days.map((day) => ({
    name: getDayLabel(day.date),
    value: day.daily_percent ?? 0,
    isNoData: day.daily_percent === null,
  }));

  return (
    <div className="w-full h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 24, right: 8, left: 8, bottom: 0 }}
        >
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 14, fill: "#6B7280" }}
          />
          <YAxis hide domain={[0, 100]} />
          <Bar
            dataKey="value"
            radius={[10, 10, 0, 0]}
            maxBarSize={32}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isNoData ? "#E5E7EB" : "#3B82F6"}
              />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              fontSize={12}
              fill="#6B7280"
              formatter={(value) => `${value}%`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import type { components } from "./api-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

type ApiError = components["schemas"]["ErrorObject"];

type ApiResponse<T> = {
  data?: T;
  error?: ApiError;
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (res.status === 204) {
      return { data: undefined as T };
    }

    const json = await res.json();

    if (!res.ok) {
      if (res.status === 401 && typeof window !== "undefined" && !endpoint.startsWith("/auth/")) {
        window.location.href = "/login";
      }
      return { error: json.error };
    }

    return { data: json };
  } catch {
    return {
      error: {
        code: "NETWORK_ERROR",
        message: "サーバーに接続できません",
        fields: {},
        details: {},
      },
    };
  }
}

// Auth API
export type User = components["schemas"]["User"];

type AuthResponse = {
  user: User;
};

type MeResponse = {
  user: User;
  settings: Settings;
};

export async function register(email: string, password: string) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return request<void>("/auth/logout", {
    method: "POST",
  });
}

export async function getMe() {
  return request<MeResponse>("/auth/me");
}

// Stamps API
export type StampResponse = components["schemas"]["StampStatusResponse"];

export async function postStamp(date: string) {
  return request<StampResponse>("/stamps", {
    method: "POST",
    body: JSON.stringify({ date }),
  });
}

export async function getStampStatus(date: string) {
  return request<StampResponse>(`/stamps/status?date=${date}`);
}

// Daily API
export type DailyTask = components["schemas"]["DailyTaskItem"];
export type DailyResponse = components["schemas"]["DailyGetResponse"];
export type DailyCheckResponse = components["schemas"]["DailySaveResponse"];

export async function getDaily(date: string) {
  return request<DailyResponse>(`/daily?date=${date}`);
}

export async function postDailyCheck(
  date: string,
  taskAchievements: { taskId: string; percent: number }[]
) {
  return request<DailyCheckResponse>("/daily/check", {
    method: "POST",
    body: JSON.stringify({ date, taskAchievements }),
  });
}

// Tasks API
export type Task = components["schemas"]["Task"];

type TasksResponse = {
  tasks: Task[];
};

type TaskResponse = {
  task: Task;
};

export async function getTasks(active: "true" | "false" | "all" = "true") {
  return request<TasksResponse>(`/tasks?active=${active}`);
}

export async function createTask(title: string, weight: number, is_active = true) {
  return request<TaskResponse>("/tasks", {
    method: "POST",
    body: JSON.stringify({ title, weight, is_active }),
  });
}

export async function updateTask(
  id: string,
  updates: { title?: string; weight?: number; is_active?: boolean }
) {
  return request<TaskResponse>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteTask(id: string) {
  return request<void>(`/tasks/${id}`, {
    method: "DELETE",
  });
}

// Weekly API
export type WeeklyDay = components["schemas"]["WeeklyDay"];
export type WeeklyResponse = components["schemas"]["WeeklyResponse"];

export async function getWeekly(weekStart: string) {
  return request<WeeklyResponse>(`/weekly?week_start=${weekStart}`);
}

// Settings API
export type Settings = components["schemas"]["Settings"];

type SettingsResponse = {
  settings: Settings;
};

export async function updateSettings(weeklyTargetPercent: number | null) {
  return request<SettingsResponse>("/settings", {
    method: "PATCH",
    body: JSON.stringify({ weekly_target_percent: weeklyTargetPercent }),
  });
}

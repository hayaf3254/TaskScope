const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

type ApiError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
  details?: Record<string, unknown>;
};

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
      return { error: json.error };
    }

    return { data: json };
  } catch {
    return {
      error: {
        code: "NETWORK_ERROR",
        message: "サーバーに接続できません",
      },
    };
  }
}

// Auth API
export type User = {
  id: string;
  email: string;
};

type AuthResponse = {
  user: User;
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

// Stamps API
export type StampResponse = {
  date: string;
  stamped: boolean;
  streak_current: number;
  streak_best: number;
};

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
export type DailyTask = {
  taskId: string;
  title: string;
  weight: number;
  achievement_percent: number;
};

export type DailyResponse = {
  date: string;
  denominator_weight: number | null;
  weighted_numerator: number | null;
  daily_percent: number | null;
  tasks: DailyTask[];
  is_no_task_day: boolean;
};

export type DailyCheckResponse = {
  date: string;
  denominator_weight: number;
  weighted_numerator: number;
  daily_percent: number;
};

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
export type Task = {
  id: string;
  title: string;
  weight: number;
  is_active: boolean;
  archived_at: string | null;
};

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
export type WeeklyDay = {
  date: string;
  daily_percent: number | null;
  is_no_task_day: boolean;
};

export type WeeklyResponse = {
  week_start: string;
  week_end: string;
  days: WeeklyDay[];
  weekly_average: number;
  target_percent: number | null;
};

export async function getWeekly(weekStart: string) {
  return request<WeeklyResponse>(`/weekly?week_start=${weekStart}`);
}

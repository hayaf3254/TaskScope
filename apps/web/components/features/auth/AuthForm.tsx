"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { InputField } from "@/components/ui/InputField";
import { login, register } from "@/lib/api";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setIsLoading(true);

    const result = isLogin
      ? await login(email, password)
      : await register(email, password);

    setIsLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (isLogin) {
      router.push("/stamp");
    } else {
      setSuccess("登録が完了しました。ログイン画面に移動します...");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="app-icon mx-auto mb-4">
            <ArrowUpRight />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">TaskScope</h1>
          <p className="text-sm text-gray-500">
            タスクの達成率を可視化して継続をサポート
          </p>
        </div>

        {/* Form Card */}
        <Card>
          {/* Tabs */}
          <div className="flex mb-6">
            <a
              href="/login"
              className={`tab ${isLogin ? "tab-active" : ""}`}
            >
              ログイン
            </a>
            <a
              href="/register"
              className={`tab ${!isLogin ? "tab-active" : ""}`}
            >
              新規登録
            </a>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <InputField
                label="メールアドレス"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
              />

              <InputField
                label="パスワード"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
              />

              {!isLogin && (
                <InputField
                  label="パスワード（確認）"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="もう一度入力"
                />
              )}
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
            )}

            {success && (
              <p className="mt-4 text-sm text-green-600 text-center">{success}</p>
            )}

            <PrimaryButton type="submit" disabled={isLoading} className="mt-6">
              {isLoading ? "..." : isLogin ? "ログイン" : "新規登録"}
            </PrimaryButton>
          </form>
        </Card>
      </div>
    </div>
  );
}

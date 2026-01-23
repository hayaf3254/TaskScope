"use client";

import { useState } from "react";
import { SquareArrowOutUpRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { login, register } from "@/lib/api";

export function LoginScreen() {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // バリデーション
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }

    if (!isLoginTab && password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setIsLoading(true);

    const result = isLoginTab
      ? await login(email, password)
      : await register(email, password);

    setIsLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    // 成功時: ダッシュボードへリダイレクト（後で実装）
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="app-icon mx-auto mb-4">
            <SquareArrowOutUpRight strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">TaskScope</h1>
          <p className="text-sm text-gray-500">
            タスクの達成率を可視化して継続をサポート
          </p>
        </div>

        {/* Form Card */}
        <Card>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => setIsLoginTab(true)}
              className={`tab ${isLoginTab ? "tab-active" : ""}`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => setIsLoginTab(false)}
              className={`tab ${!isLoginTab ? "tab-active" : ""}`}
            >
              新規登録
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-underline"
                  placeholder="example@email.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-underline"
                  placeholder="8文字以上"
                />
              </div>

              {/* Confirm Password (register only) */}
              {!isLoginTab && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    パスワード（確認）
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-underline"
                    placeholder="もう一度入力"
                  />
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
            )}

            {/* Submit Button */}
            <PrimaryButton type="submit" disabled={isLoading} className="mt-6">
              {isLoading ? "..." : isLoginTab ? "ログイン" : "新規登録"}
            </PrimaryButton>
          </form>
        </Card>
      </div>
    </div>
  );
}

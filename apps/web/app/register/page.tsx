"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/features/auth/AuthForm";
import { getMe } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    getMe().then(({ data }) => {
      if (data) {
        router.replace("/stamp");
      }
    });
  }, [router]);

  return <AuthForm mode="register" />;
}

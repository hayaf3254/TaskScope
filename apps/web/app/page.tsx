"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    getMe().then(({ data }) => {
      if (data) {
        router.replace("/stamp");
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  return null;
}

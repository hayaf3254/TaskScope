import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    rules: {
      // 未使用変数は警告（_で始まる変数は許可）
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // any型は警告のみ（厳しくしすぎない）
      "@typescript-eslint/no-explicit-any": "warn",
      // console.logは許可（開発中なので）
      "no-console": "off",
    },
  }
);

# TaskScope
### タスクの「重み」を可視化し、継続を科学する習慣管理アプリ

![デモ動画](ここにアプリが動いているGIF動画を貼る.gif)
## ■ 概要・リンク
| 項目 | URL |
| --- | --- |
| **アプリURL** | [デプロイのリンク](https://task-scope-ochre.vercel.app/) |
| **Figma (デザイン)** | [Figmaのリンク](https://www.figma.com/proto/0ACM88dzRo81Dtq4wjfZMN/%E3%82%BF%E3%82%B9%E3%82%AF%E3%82%B9%E3%82%B3%E3%83%BC%E3%83%97?node-id=22-176&t=4LvcpUzbNMYkerpU-0&scaling=min-zoom&content-scaling=fixed&page-id=17%3A5&starting-point-node-id=22%3A176) |
| **設計資料** | [Google Drive](https://drive.google.com/drive/u/0/folders/1e7002Lb9P89eEFyy3Ue3rzfSNWzD9ONw) (ER図 / 仕様書など) |

---

## ■ 開発背景と解決する課題
日々の学習（プログラミング、英語、研究など）を紙で管理していましたが、タスクの重みを考慮した達成率を毎晩ノートの上で手計算しており、その集計作業が大きな負担になっていました。

タスクスコープは、この**「手計算していた独自ロジック」をシステム化**し、日次・週次の達成率を瞬時に可視化することで、集計の手間をなくし学習の質を最大化するアプリです。

**【主な機能】**
* **重み付き達成率:** 単純な消化数ではなく、タスクの重さを考慮した進捗率（0-100%）を算出 
* **週次分析:** 7日間の推移と週平均を可視化し、翌週の配分調整をサポート 
* **継続支援:** スタンプとストリーク機能でモチベーション維持 

---

## ■ 使用技術

### システム構成
**Frontend (Vercel) ⇔ Backend API (Fly.io) ⇔ Database (Neon)**

| カテゴリ | 使用技術 |
| --- | --- |
| **Frontend** | Next.js (App Router), TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express, TypeScript  |
| **Database** | PostgreSQL (Neon) |
| **Infra/Deploy** | Vercel (Front), Fly.io (Back), Docker |
| **DevOps** | GitHub Actions (Lint/Test/Build), Vitest |
| **Design/Docs** |Figma, OpenAPI, dbdiagram.io |

---

## ■ 技術的なこだわり・工夫点

### 1. スキーマ駆動開発による手戻り防止
個人開発ですが、フロントエンドとバックエンドの整合性を保つため、実装前に **OpenAPI (Swagger)** と **ER図** で仕様を確定させてから実装に入りました。
型定義の自動生成を活用し、仕様の認識齟齬による手戻りを防いでいます。
<img width="1198" height="687" alt="image" src="https://github.com/user-attachments/assets/69d654c7-81e5-441b-b76a-0a61fab7d97f" />
<img width="678" height="888" alt="image" src="https://github.com/user-attachments/assets/b096ac64-f325-4a08-89de-0c4b00593054" />

※ 図中の「LINE連携機能」はPhase2での実装予定です。今回のMVPには含まれていません。

### 2. セキュリティを意識した認証設計 (JWT + HttpOnly Cookie)
安易なLocalStorage保存ではなく、**HttpOnly / Secure / SameSite** 属性を付与したCookieにJWTを保存する設計を採用し、XSSやCSRFのリスクを軽減しています。
また、バックエンドAPIはステートレスな構成にすることで、スケーラビリティを確保しました。

### 3. フロントエンドとバックエンドの責務分離
Next.jsのAPI Routesだけで完結させず、あえてバックエンドを分離（Express / Fly.io）しました。
* **学習意図:** UI/UXとドメインロジック/データ永続化の責務を明確に分けるアーキテクチャを経験するため
* **拡張性:** 将来的にバックエンドで常駐プロセスが必要になった際への備え

### 4. ドメインロジックの実装（重み付き達成率）
「タスク数」ではなく「重み（Weight）」に基づいた達成率計算ロジックをバックエンドに実装しています。
* **日次達成率:** `Σ(達成度 × 重み) / Σ(全有効タスクの重み)` で算出 
* **週平均:** 記録がない日（Null）も「0%」として扱い、7日間固定で平均を算出する「自分に厳しめの仕様」にしています 

### 5. CI/CDパイプラインによる品質担保
GitHub Actionsを導入し、Pull Request時に `Lint`, `Type Check`, `Unit Test (Vitest)`, `Build` を自動実行しています。
「テストが通らないコードはマージしない」というルールを運用し、コード品質を担保しました。

---

## ■ 設計資料（抜粋）
※詳細なドキュメントはページ上部のリンクに格納しています。

#### ▼ ユースケース図
<img width="868" height="585" alt="image" src="https://github.com/user-attachments/assets/698dd416-6874-46a9-9c3b-692d088118a8" />

※ 図中の「LINE連携機能」はPhase2での実装予定です。今回のMVPには含まれていません。


#### ▼ アーキテクチャ図



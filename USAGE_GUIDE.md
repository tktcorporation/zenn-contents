# Zenn CLIプロジェクト使い方ガイド

## セットアップ完了
Zenn CLIがインストールされ、プロジェクトの初期化が完了しました。

## 基本的な使い方

### 1. 記事の作成
```bash
npm run new:article
# または
npx zenn new:article
```
- `articles/`ディレクトリに新しいMarkdownファイルが作成されます
- ファイル名はランダムなスラッグ（ID）になります

### 2. 本の作成
```bash
npm run new:book
# または
npx zenn new:book
```

### 3. プレビュー
```bash
npm run preview
# または
npx zenn preview
```
- `http://localhost:8000`でプレビューが確認できます
- ファイルを保存すると自動的にリロードされます

### 4. 記事一覧の確認
```bash
npm run list:articles
# または
npx zenn list:articles
```

## 記事の管理

### 記事のメタデータ
各記事の冒頭にはFront Matterでメタデータを設定します：

```yaml
---
title: "記事のタイトル"
emoji: "📝"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["javascript", "react", "nextjs"]
published: false # true にすると公開される
---
```

### 画像の配置
画像は`/images`ディレクトリを作成して配置します：
```bash
mkdir images
```

記事内での画像の参照：
```markdown
![画像の説明](/images/example.png)
```

## GitHub連携とデプロイ

### 1. GitHubリポジトリとの連携
1. このリポジトリをGitHubにプッシュ
2. [Zennのダッシュボード](https://zenn.dev/dashboard/deploys)にアクセス
3. 「GitHubからのデプロイ」を選択
4. リポジトリを連携

### 2. 記事の公開
1. 記事のFront Matterで`published: true`に変更
2. GitHubにプッシュ
3. 自動的にZennにデプロイされます

### 3. ブランチ戦略（推奨）
- `main`ブランチ：公開用
- 作業用ブランチ：下書き・レビュー用

## よく使うコマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run preview` | プレビューサーバーを起動 |
| `npm run new:article` | 新しい記事を作成 |
| `npm run new:book` | 新しい本を作成 |
| `npm run list:articles` | 記事一覧を表示 |
| `npm run list:books` | 本の一覧を表示 |

## トラブルシューティング

### プレビューが表示されない
- Node.js 14以上がインストールされているか確認
- `npm install`でパッケージが正しくインストールされているか確認

### 画像が表示されない
- `/images`ディレクトリに画像を配置しているか確認
- パスが正しいか確認

### CLIのアップデート
最新版へのアップデート：
```bash
npm update zenn-cli
```

## 詳細情報
- [Zenn公式ドキュメント](https://zenn.dev/zenn)
- [Zenn CLIの使い方](https://zenn.dev/zenn/articles/zenn-cli-guide)
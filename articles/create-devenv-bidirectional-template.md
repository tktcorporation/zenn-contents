---
title: "開発環境テンプレートが陳腐化する問題を双方向同期で解決する"
emoji: "🔄"
type: "tech"
topics: ["devcontainer", "cli", "template", "nodejs"]
published: false
---

# 課題

開発環境のテンプレートを作って、新規プロジェクトで使い回すようにしていた。

- DevContainer の設定
- GitHub Actions のワークフロー
- mise や MCP の設定ファイル

最初は便利だったけど、しばらく運用していると問題が出てきた。

## テンプレートが陳腐化する

プロジェクトAで「この設定追加したほうがいいな」と思って改善しても、その変更はプロジェクトAにしか反映されない。テンプレートリポジトリに手動で反映するのは面倒だし、忘れる。

結果、テンプレートはどんどん古くなって、新規プロジェクトで使うたびに「あれ、この設定足りてないな」となる。

## 各プロジェクトの設定がバラバラになる

プロジェクトごとに独自の改善が入っていくので、似たような設定なのに微妙に違う状態になる。どれが最新のベストプラクティスなのかわからなくなる。

# やったこと

テンプレートとプロジェクトの間で双方向に同期できる CLI を作った。

https://github.com/tktcorporation/.github

## 基本的な考え方

- `init`: テンプレートからプロジェクトに適用（従来のテンプレート機能）
- `push`: プロジェクトの改善をテンプレートに PR として送信
- `diff`: 今どれくらい差分があるか確認

従来のテンプレートは一方通行だったけど、`push` で逆方向にも流せるようにした。

## 使い方

```bash
# 新規プロジェクトにテンプレートを適用
npx @tktco/create-devenv

# プロジェクトで改善した内容をテンプレートに反映
npx @tktco/create-devenv push -m "Add new GitHub Action workflow"

# 差分を確認
npx @tktco/create-devenv diff
```

## 提供しているモジュール

今のところ4つのカテゴリがある。

| カテゴリ | 内容 |
|---------|------|
| Root | MCP、mise 等の設定ファイル |
| DevContainer | VS Code DevContainer（Docker-in-Docker 対応） |
| GitHub | GitHub Actions と labeler ワークフロー |
| Claude | Claude Code プロジェクト設定 |

`init` 時にどのモジュールを使うか選べる。

## 生成されるファイル

```
.devcontainer/     # DevContainer 設定
.github/           # GitHub Actions
.claude/           # Claude Code 設定
.mcp.json          # MCP サーバー設定
.mise.toml         # 開発ツール管理
.devenv.json       # どのモジュールを使っているかの追跡
```

`.devenv.json` で選択したモジュールを追跡しているので、`push` や `diff` 時にどのファイルを対象にするか判断できる。

# 実際の運用

1. 新規プロジェクトで `npx @tktco/create-devenv` を実行
2. プロジェクトで作業していて「この設定いいな」と思ったら `push` でテンプレートに PR
3. テンプレートにマージされたら、他のプロジェクトでも `init` で取り込める

テンプレートの改善が自然と蓄積されていくので、陳腐化しにくくなった。

# おわりに

わりとありがちな課題感だと思うので、一例として共有してみた。

同じような問題を抱えている人の参考になれば。

https://www.npmjs.com/package/@tktco/create-devenv

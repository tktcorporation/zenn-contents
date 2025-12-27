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

従来のテンプレートは一方通行だったけど、`push` で逆方向にも流せるようにした。

## 実行例

### init: テンプレートの適用

```bash
$ npx @tktco/create-devenv init -y
```

```
create-devenv v0.6.0
────────────────────────────────────────
● Target: /tmp/test-devenv

[1/3] ◆ Fetching template...
✔ Downloading template from GitHub...
[2/3] ◆ Selecting modules...

● Auto-selected 4 modules

[3/3] ◆ Applying templates...

  + .mcp.json (added)
  + .mise.toml (added)
  + .devcontainer/devcontainer.json (added)
  + .github/labeler.yml (added)
  + .github/workflows/issue-link.yml (added)
  + .github/workflows/label.yml (added)
  + .claude/settings.json (added)
  + .devenv.json (added)

────────────────────────────────────────
✓ Done! 13 added

╭─────────────────╮
│ Setup complete! │
╰─────────────────╯

● Installed modules:

  ◆ Root
    Root config files will be applied
  ◆ DevContainer
    Open in VS Code DevContainer for automatic setup
  ◆ GitHub
    Auto-labels PRs and links issues on creation
  ◆ Claude
    Claude Code project settings will be applied
```

`-y` オプションで全モジュールを自動選択。対話モードで個別に選ぶこともできる。

### push: テンプレートへの反映

プロジェクトで設定を改善したら、`push` でテンプレートリポジトリに PR を送れる。

例えば、`.mise.toml` にカスタムタスクを追加したとする。

```toml
# .mise.toml に追記
[tasks.hello]
run = "echo hello"
description = "Say hello"
```

まずは `--dryRun` で差分を確認。

```bash
$ npx @tktco/create-devenv push --dryRun
```

```
create-devenv push
────────────────────────────────────────
[1/2] ◆ Fetching template...
✔ Downloading template from GitHub...
[2/2] ◆ Detecting changes...
✔ Analyzing differences...

╭──────────────╮
│ Dry run mode │
╰──────────────╯

Files that would be included in PR:
──────────────────────────────────────────────────
  ~1 modified │ 11 unchanged

  ~ .mise.toml
    └─ Content differs from template

● No PR was created (dry run)
```

テンプレートとの差分があるファイルが検出される。問題なければ `--dryRun` を外して実行。

```bash
$ npx @tktco/create-devenv push
```

対話モードでファイル選択 → PR タイトル入力 → PR 作成まで進められる。

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

`.devenv.json` で選択したモジュールを追跡しているので、`push` 時にどのファイルを対象にするか判断できる。

# 実際の運用

1. 新規プロジェクトで `npx @tktco/create-devenv` を実行
2. プロジェクトで作業していて「この設定いいな」と思ったら `push` でテンプレートに PR
3. テンプレートにマージされたら、他のプロジェクトでも `init` で取り込める

テンプレートの改善が自然と蓄積されていくので、陳腐化しにくくなった。

# おわりに

わりとありがちな課題感だと思うので、一例として共有してみた。

同じような問題を抱えている人の参考になれば。

https://www.npmjs.com/package/@tktco/create-devenv

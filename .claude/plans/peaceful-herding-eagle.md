# ziku 記事リライト計画

## Context

現記事のリライト。ユーザーからの詳細フィードバックを反映した構成に変更する。

**核心のモチベーション**: Claude Code を使い込むと `settings.json`, rules, skills, plugins, `.mcp.json`, `.mise.toml` など「いろんなプロジェクトで使い回す設定」が増える。あるプロジェクトで改善したら他にも持っていきたい。でも手動コピーだと「どこまでどう反映されてたっけ？」がすぐわからなくなる。これを track → push → pull で自動同期する。

## ユーザーフィードバックからの変更点

### 冒頭フック
- 「全リポジトリで揃えてますか？」→ **揃える必要はない**
- 正しいフレーム: いろんな設定ファイルが増える → プロジェクト間で使い回したい → 改善を他に持っていきたい → 手動だと管理が崩壊する → ziku で解決

### プロジェクトスコープの話（新規追加）
- ユーザーは複数PC・Claude Code Web で作業するため、プロジェクトスコープに設定を置いている
- Git diff で設定の状態が把握できる利点
- この運用スタイルが ziku と相性が良い

### 比較表
- dotfiles / chezmoi / cookiecutter / degit → **削除**（知らないので書かない）
- **3行のみ**: GitHub Template Repository, Git Submodule, ziku
- Submodule との差別化に「ディレクトリ横断の柔軟性」を追加（Submodule はそのディレクトリ以下のみ、ziku はルートでも深い階層でも自由に適用可能）

### 構造化マージ → **削除**（まだ自信がない）
### 技術スタック → **削除**
### 設計のこだわり → **削除**

### .claude/ ツリー例 → 汎用的に
```
.claude/
├── settings.json       # パーミッション設定、プラグイン
├── rules/
│   └── pr-workflow.md   # PR ワークフロー
└── skills/
    └── ui-craft/SKILL.md  # UI 実装スキル
```
（intent-documentation, push-verification, autonomous-dev, upstream-fix は削除）

## 最終構成

| # | 見出し | 内容 | 分量 |
|---|--------|------|------|
| 0 | 冒頭フック | 設定ファイルが増える→使い回したい→手動管理が崩壊→ziku | 5行 |
| 1 | なぜ作ったのか | 課題ストーリー + .claude/ ツリー + mermaid 図 | 300語 |
| 2 | 既存の方法との比較 | 3行比較表（Template Repo / Submodule / ziku）+ Submodule のディレクトリ制約 | 150語 |
| 3 | こんなときに便利（3ユースケース） | push/pull/track/diff を自然に紹介 | 700語 |
| 4 | はじめ方 | setup → init の最小ステップ | 250語 |
| 5 | おわりに | 1段落 + GitHub + `npx ziku` | 100語 |

### 冒頭フックの方向性

Claude Code を使い込むほど、`settings.json`、rules、skills、`.mcp.json`、`.mise.toml` と設定ファイルが増えていく。プロジェクトスコープで管理していると、あるプロジェクトで「この設定の方がいいな」と改善したとき、他のプロジェクトにも持っていきたくなる。でも手動コピーだと、どこまで何が反映されてるかすぐわからなくなる。

→ ziku で track/push/pull するとテンプレートの状態が自動的に同期されて快適

### ユースケース3本

1. **「rules を改善 → 他リポジトリに反映したい」** — push → PR → pull の基本サイクル
2. **「新しい skill/設定を全リポジトリに配りたい」** — diff で untracked 検出 → track → push
3. **「チームで標準テンプレートを運用」** — push が PR → レビュー可能（短めでOK）

### 比較表

| 方法 | テンプレート→PJ | PJ→テンプレート | 柔軟性 |
|---|---|---|---|
| GitHub Template Repo | 初回コピーのみ | なし | - |
| Git Submodule | リアルタイム | 可能だが煩雑 | サブモジュールのディレクトリ以下のみ |
| **ziku** | `pull` で継続取得 | `push` で PR | ルート・深い階層どこでも適用可 |

※ 比較の4列目を「更新の追従」→「柔軟性」に変更し、Submodule との差別化を明示

## 削除するもの

| セクション | 理由 |
|---|---|
| コマンド一覧表 | ユースケース内で自然に登場する |
| 構造化マージ | ユーザー: まだ自信がない |
| 技術スタック表 | 不要 |
| 設計のこだわり | 不要 |
| 想定ユーザー | ユースケースで伝わる |
| 「.claude 以外にも使える」 | ユースケース内で自然に触れる |
| 比較表の dotfiles/chezmoi/cookiecutter/degit 行 | 知らないので書かない |

## 残す・活かすもの

- mermaid 図（push/pull サイクル）
- 3-way マージの言及（ユースケース内で「3-way マージなのでプロジェクト側の変更は壊されない」程度）
- track の案内（diff の untracked 検出 → track → push の流れ）
- はじめ方の基本手順（大幅圧縮）
- push/pull のコマンド出力例（ユースケース1で各1回）

## 対象ファイル

- `/workspaces/zenn-contents/articles/ziku-bidirectional-template-manager.md`

## 検証方法

1. `npx zenn preview` でプレビュー確認
2. mermaid 図の描画確認
3. 全体の流れが「課題→比較→ユースケース→始め方→CTA」になっているか確認

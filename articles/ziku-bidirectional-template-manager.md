---
title: "Claude Code の rules/skills を双方向同期するCLIツール「ziku」を作った"
emoji: "🔄"
type: "tech"
topics: ["claudecode", "cli", "devcontainer", "typescript", "oss"]
published: false
---

# はじめに

Claude Code を使い込むほど、`settings.json`、rules、skills、`.mcp.json`、`.mise.toml` と、プロジェクトに置く設定ファイルが増えていく。

自分は複数の PC や Claude Code Web で作業するので、設定はプロジェクトスコープに置いている。Git で diff が見えるし、どの環境でも同じ設定で作業できて便利だ。ただ、プロジェクトが増えると困ることが出てくる。あるプロジェクトで「この rule の方がいいな」と改善しても、他のプロジェクトには反映されない。手動コピーで頑張っていたけど、「あれ、どこまで反映したっけ？」とすぐわからなくなった。

**テンプレートは作った瞬間から陳腐化が始まる。** この「作って終わり問題」を解決するために、テンプレートとプロジェクトを双方向に同期する CLI ツール **[ziku](https://github.com/tktcorporation/ziku)**（軸）を作った。

```bash
npx ziku
```

プロジェクト側の改善を `push` でテンプレートへ PR として還元し、他のプロジェクトでは `pull` で取り込む。このサイクルを回すとテンプレートが常に最新の状態へ保たれる。プロジェクトごとの設定差分を気にしなくてよくなった。

# なぜ作ったのか

使い込むほど `.claude/` 配下のファイルが育っていく。

```
.claude/
├── settings.json       # パーミッション設定、プラグイン
├── rules/
│   └── pr-workflow.md   # PR ワークフロー
└── skills/
    └── ui-craft/SKILL.md  # UI 実装スキル
```

`.claude/` 以外にも、`.mcp.json` や `.mise.toml`、`.devcontainer/` など、プロジェクトをまたいで共通化したいファイルは多い。

これを複数リポジトリで運用していると、こういう状況になりがち。

1. テンプレートから rules / skills をコピーして新リポジトリを作る
2. 開発を進めるうちに「この rule はこう書いた方がいいな」と改善する
3. **その改善はテンプレート本体に反映されない**
4. しばらく経つと、テンプレートは古いまま、各プロジェクトの設定はそれぞれ独自進化している

「便利なプラグインが出たからテンプレートに持っていきたい」「この lint 設定、あっちのリポジトリにもあった方がいい」みたいなことが日常的に起きる。でもテンプレートへ手動で反映し続けるのは現実的じゃない。

ziku はこの問題を `push` と `pull` の双方向サイクルで解決する。

```mermaid
graph LR
    A["プロジェクトで<br/>設定を改善"] --> B["ziku push<br/>（PR で還元）"]
    B --> C["テンプレート<br/>リポジトリ"]
    C --> D["ziku pull<br/>（3-way マージ）"]
    D --> E["他のプロジェクトに<br/>反映"]
    E --> A

    style A fill:#e8f4fd,stroke:#2196F3
    style C fill:#fff3e0,stroke:#FF9800
    style E fill:#e8f4fd,stroke:#2196F3
```

# 既存の方法との比較

| 方法 | テンプレート→プロジェクト | プロジェクト→テンプレート | 柔軟性 |
|---|---|---|---|
| GitHub Template Repository | 初回コピーのみ | なし | — |
| Git Submodule | リアルタイム | 可能だが煩雑 | サブモジュールのディレクトリ以下のみ |
| **ziku** | `pull` で継続取得 | `push` で PR | ルート・深い階層どこでも適用可 |

**どれも「テンプレートからプロジェクトへ」の一方通行。プロジェクト側の改善をテンプレートに還元する仕組みがなかった。**

Git Submodule でも双方向のやり取りは一応できる。ただ、サブモジュールのディレクトリ以下にしかファイルを置けない。`.claude/rules/` と `.mcp.json`（ルート直下）と `.devcontainer/` のように、複数ディレクトリに跨る設定の管理には向かない。ziku はファイルパターンで同期対象を指定するので、どこにあるファイルでも柔軟に扱える。

# こんなときに便利

## 「rules を改善したけど、他のリポジトリにも反映したい」

プロジェクト A で `pr-workflow.md` を改善した。同じ rules を使っているプロジェクト B, C にも反映したい。

```bash
# プロジェクト A で改善をテンプレートに還元
npx ziku push -m "pr-workflow に CI ウォッチの手順を追加"
```

```
┌   ziku push  v1.0.2
│
◇  Detecting changes...
│
◇  Analyzing differences...
│
◇  Files that would be included in PR:
│
│  ~ .claude/rules/pr-workflow.md
│
│  ~1 modified
│
◇  PR を作成しました: your-org/.github#12
```

テンプレートリポジトリに PR が作られる。マージされたら、他のプロジェクトで `pull` するだけ。

```bash
# プロジェクト B, C で最新テンプレートを取り込む
npx ziku pull
```

```
┌   ziku pull  v1.0.2
│
◇  Detecting changes...
│
◇  Applying updates...
│
│  ~ .claude/rules/pr-workflow.md (3-way merge)
│
│  ~1 modified
│
└  Pull complete!
```

3-way マージなので、プロジェクト側で独自に変えた部分は壊されない。コンフリクトが起きたら git と同じ形式のマーカーが出るので、解決して `pull --continue` すればいい。

## 「新しい skill を全リポジトリに配りたい」

プロジェクトで新しい skill を作った。テンプレートに追加して、他のプロジェクトにも配りたい。

`diff` を実行すると、同期対象の差分だけでなく、**同期対象外のファイル**も検出して `track` を案内してくれる。

```bash
npx ziku diff
```

```
┌   ziku diff  v1.0.2
│
◇  Detecting changes...
│
◆  Tracked files are in sync.
│
▲  However, 2 untracked file(s) exist outside the sync whitelist:
│
│    • .claude/skills/ui-design-research/SKILL.md
│    • .claude/skills/ui-design-research/references/design-patterns.md
│
●  Use npx ziku track <pattern> to add them, then push to sync.
│
└  Tracked files are in sync, but untracked files exist.
```

`track` で同期対象に追加してから `push` すれば、テンプレートにもパターンごと反映される。

```bash
npx ziku track '.claude/skills/ui-design-research/**'
npx ziku push -m "ui-design-research skill を追加"
```

他のプロジェクトで `pull` すると、ファイルだけでなく **新しいパターンも自動でマージ** される。

## 「チームで標準テンプレートを運用したい」

Organization の `.github` リポジトリをチーム共通テンプレートとして使う。メンバーが `push` すると PR になるので、レビューしてからマージできる。コピペで広がった設定が散逸することなく、チーム全体の設定が一箇所で育っていく。

# はじめ方

## 1. テンプレートリポジトリを用意する

Organization（または個人アカウント）に `.github` や `.ziku` というリポジトリを作り、`setup` コマンドで初期化する。

```bash
npx ziku setup
```

`.ziku/ziku.jsonc` が作られるので、同期したいファイルパターンを定義する。

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/tktcorporation/ziku/main/schema/ziku.json",
  "include": [
    ".claude/settings.json",
    ".claude/rules/*.md",
    ".claude/skills/**",
    ".devcontainer/**",
    ".mcp.json",
    ".mise.toml"
  ]
}
```

## 2. プロジェクトにテンプレートを適用する

```bash
npx ziku --from your-org/.github
```

`--from` を省略すると git remote の Organization から自動検出する。ローカルディレクトリをテンプレートとして使う場合は `--from-dir` を指定する。

セットアップが終わったら、あとは `pull` と `push` の繰り返し。別のプロジェクトで作業を始めるときは `pull` してからスタートすれば、テンプレートの最新状態が反映された環境で開発を始められる。

# おわりに

テンプレートを「作って終わり」にしたくなかった。設定を改善したら `push` で還元し、別のプロジェクトでは `pull` で取り込む。このサイクルが回り始めると、テンプレートが勝手に育っていく。自分の開発では既に欠かせないツールになっている。

https://github.com/tktcorporation/ziku

```bash
npx ziku
```

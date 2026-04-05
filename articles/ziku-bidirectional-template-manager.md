---
title: "テンプレートの「作って終わり」を解決する双方向同期CLIツール「ziku」を作った"
emoji: "🔄"
type: "tech"
topics: ["cli", "devcontainer", "typescript", "開発環境", "oss"]
published: false
---

# はじめに

開発環境テンプレートを双方向に同期できる CLI ツール **ziku**（軸）を作った。

https://github.com/tktcorporation/ziku

```bash
npx ziku
```

テンプレートからプロジェクトに設定を取り込むだけでなく、プロジェクト側の改善をテンプレートに PR として還元できるのが特徴。

# なぜ作ったのか

複数のリポジトリで `.devcontainer` や `.github/workflows`、lint 設定などを揃えて運用していると、こういう状況になりがち。

1. テンプレートから新しいリポジトリを作る
2. 開発を進めるうちに「ここはこうした方がいいな」と改善する
3. **その改善はテンプレート本体に反映されない**
4. しばらく経つと、テンプレートは古いまま、各プロジェクトはそれぞれ独自進化している

テンプレートを更新しても、既存プロジェクトに反映する仕組みがない。逆に、プロジェクト側で見つけた良い設定をテンプレートに戻すには手動コピーするしかない。

結局 **テンプレートは作った瞬間から陳腐化が始まる** というのが、ずっと感じていた課題だった。

# 既存の方法との比較

テンプレートの管理にはいくつかの既存手段があるが、それぞれに限界がある。

| 方法 | テンプレート→プロジェクト | プロジェクト→テンプレート | 更新の追従 |
|---|---|---|---|
| GitHub Template Repository | 初回コピーのみ | なし | なし |
| `cookiecutter` / `degit` | 初回生成のみ | なし | なし |
| Git Submodule | リアルタイム | 可能だが煩雑 | 手動 pull |
| 手動コピー | 都度コピー | 都度コピー | 気合い |
| **ziku** | `pull` で継続取得 | `push` で PR 作成 | `diff` で差分確認 |

どのツールも「テンプレートからプロジェクトへ」の一方通行で、**プロジェクト側の改善をテンプレートに還元する仕組み** を持っていなかった。ここが ziku を作った動機。

# 主な機能

## pull ── テンプレートの更新をプロジェクトに取り込む

```bash
npx ziku pull
```

テンプレートリポジトリの最新変更をプロジェクトにマージする。内部的に **3-way マージ** を行うため、プロジェクト側の変更を壊さずにテンプレートの更新を取り込める。

コンフリクトが発生した場合は、git と同じ形式のコンフリクトマーカーが生成される。

```
<<<<<<< LOCAL
"prettier": "^3.0.0"
=======
"eslint": "^9.0.0"
>>>>>>> TEMPLATE
```

手動で解決した後、`npx ziku pull --continue` で完了。

## push ── プロジェクトの改善をテンプレートに PR で還元する

```bash
npx ziku push
```

プロジェクト側で加えた改善を、テンプレートリポジトリに **GitHub PR として** 送る。対話的にファイルを選択でき、`--dry-run` で事前確認もできる。

```bash
npx ziku push --dry-run
npx ziku push --title "devcontainer に mise を追加"
```

PR になるのでレビュープロセスを挟めるのもポイント。テンプレートに雑な変更が混ざるのを防げる。

## diff ── テンプレートとの差分を確認する

```bash
npx ziku diff
```

現在のプロジェクトとテンプレートの差分を表示する。`pull` する前に何が変わるのか確認するときに使う。

## init ── テンプレートの初回適用

```bash
npx ziku
```

引数なしで実行すると対話的にセットアップが始まる。git remote の Organization から自動的にテンプレートリポジトリ（`{org}/.ziku`）を検出する。テンプレートリポジトリが存在しない場合は、その場で作成することもできる。

```bash
# 明示的にテンプレートを指定する場合
npx ziku init --from github:your-org/.ziku
```

# 構造化マージ ── 設定ファイルを賢くマージ

技術的に一番こだわったのが **構造化マージ**。

JSON、JSONC、TOML、YAML といった設定ファイルは、行単位の diff ではなく **キー・値レベル** でマージする。これにより、例えば `package.json` の `dependencies` にテンプレート側とプロジェクト側がそれぞれ別のパッケージを追加していても、不要なコンフリクトが発生しない。

```
テンプレート側で "eslint": "^9.0.0" を追加
プロジェクト側で "prettier": "^3.0.0" を追加
→ 構造化マージで両方が残る（行単位 diff だとコンフリクトになりがち）
```

構造化マージで解決できない場合にのみ、テキストレベルのマージにフォールバックしてコンフリクトマーカーを生成する。

# モジュールシステム

テンプレートの管理単位は **モジュール** で整理される。`.ziku/modules.jsonc` で定義し、glob パターンでファイルを指定する。

```jsonc
// .ziku/modules.jsonc
{
  "modules": [
    {
      "name": "DevContainer",
      "filePatterns": [".devcontainer/**"]
    },
    {
      "name": "GitHub",
      "filePatterns": [".github/**"]
    },
    {
      "name": "Claude",
      "filePatterns": [".claude/**"]
    }
  ]
}
```

`ziku init` 時にどのモジュールを適用するか選択できるので、「DevContainer の設定だけ欲しい」「GitHub Actions も含めて全部欲しい」といった使い分けが可能。

# 技術スタック

| カテゴリ | 技術 |
|---|---|
| 言語 | TypeScript (ESM) |
| エラーハンドリング | [Effect](https://effect.website/) |
| パターンマッチ | [ts-pattern](https://github.com/gvergnaud/ts-pattern) |
| CLI フレームワーク | [citty](https://github.com/unjs/citty) |
| 対話 UI | [@clack/prompts](https://github.com/bombshell-dev/clack) |
| GitHub API | [@octokit/rest](https://github.com/octokit/rest.js) |
| バリデーション | [Zod](https://zod.dev/) v4 (Branded Types) |
| ビルド | [tsdown](https://github.com/nicepkg/tsdown) |
| テスト | [Vitest](https://vitest.dev/) |
| リント / フォーマット | [oxlint](https://oxc.rs/) / [oxfmt](https://oxc.rs/) |

Effect と ts-pattern の組み合わせで、エラーハンドリングと分岐を型安全に書けるのが気に入っている。Zod v4 の Branded Types でファイルパスなどのプリミティブ型に意味を持たせているのもこだわりポイント。

# 想定ユーザー

こんな人に使ってもらえると嬉しい。

- **複数リポジトリで開発環境を統一したい人** ── `.devcontainer`、CI、lint 設定など
- **テンプレートを作ったけど放置気味な人** ── 双方向同期で生きたテンプレートに
- **Organization でチーム標準テンプレートを運用したい人** ── `push` が PR になるのでレビューも回せる

# 今後の予定

- `track` コマンドの拡充（管理対象ファイルの追加をもっと簡単に）
- テンプレート適用時のモジュール選択 UI の改善
- マージ戦略のカスタマイズ対応

# おわりに

テンプレートを「作って終わり」にせず、プロジェクトと一緒に育てていけるツールを目指して作った。まだ荒削りな部分もあるけれど、自分自身の複数リポジトリ運用では日常的に使っている。

興味があればぜひ触ってみてほしい。Issue や PR も歓迎。

https://github.com/tktcorporation/ziku

```bash
npx ziku
```

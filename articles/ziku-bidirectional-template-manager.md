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

結局 **テンプレートは作った瞬間から陳腐化が始まる** というのが、ずっと感じていた課題だった。

# 既存の方法との比較

| 方法 | テンプレート→プロジェクト | プロジェクト→テンプレート | 更新の追従 |
|---|---|---|---|
| GitHub Template Repository | 初回コピーのみ | なし | なし |
| `cookiecutter` / `degit` | 初回生成のみ | なし | なし |
| Git Submodule | リアルタイム | 可能だが煩雑 | 手動 pull |
| **ziku** | `pull` で継続取得 | `push` で PR 作成 | `diff` で差分確認 |

どれも「テンプレートからプロジェクトへ」の一方通行。**プロジェクト側の改善をテンプレートに還元する仕組み** がなかった。

# こんなときに便利

## 「あのリポジトリで直した設定、こっちにも欲しい」

プロジェクト A で `.devcontainer` の設定を改善した。同じテンプレートを使っているプロジェクト B, C にも反映したい。

```bash
# プロジェクト A で改善をテンプレートに還元
npx ziku push --message "devcontainer に mise を追加"
```

テンプレートリポジトリに PR が作られる。マージされたら、他のプロジェクトで `pull` するだけ。

```bash
# プロジェクト B, C で最新テンプレートを取り込む
npx ziku pull
```

## 「テンプレート更新したけど、既存プロジェクトに反映するの面倒…」

テンプレート側で CI の設定を変えた。手動コピー？ いや、`pull` 一発。

```bash
npx ziku diff    # まず何が変わるか確認
npx ziku pull    # 問題なければ取り込み
```

3-way マージなので、プロジェクト側で独自に変えた部分は壊されない。コンフリクトが起きたら git と同じ形式のマーカーが出るので、解決して `pull --continue` すればいい。

## 「新しいリポジトリ作るたびに設定ファイルをコピペしてる」

```bash
npx ziku
```

引数なしで対話的にセットアップが始まる。Organization から `.ziku` テンプレートリポジトリを自動検出してくれるので、URL を覚える必要もない。

モジュール単位で「DevContainer だけ」「GitHub Actions も含めて全部」と選べるので、プロジェクトに合わせて必要なものだけ取り込める。

## 「設定ファイルのマージで無駄なコンフリクトが起きる」

`package.json` にテンプレート側とプロジェクト側がそれぞれ別のパッケージを追加した場合、普通の diff だとコンフリクトになりがち。

ziku は JSON / JSONC / TOML / YAML をキー・値レベルで **構造化マージ** するので、こういう不要なコンフリクトを避けられる。

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
| リント | [oxlint](https://oxc.rs/) / [ast-grep](https://ast-grep.github.io/) |

Effect と ts-pattern の組み合わせで、エラーハンドリングと分岐を型安全に書いている。Zod v4 の Branded Types でファイルパスなどのプリミティブ型に意味を持たせているのもこだわりポイント。

# 想定ユーザー

- **複数リポジトリで開発環境を統一したい人** ── `.devcontainer`、CI、lint 設定など
- **テンプレートを作ったけど放置気味な人** ── 双方向同期で生きたテンプレートに
- **Organization でチーム標準テンプレートを運用したい人** ── `push` が PR になるのでレビューも回せる

# おわりに

テンプレートを「作って終わり」にせず、プロジェクトと一緒に育てていけるツールを目指して作った。まだ荒削りな部分もあるけれど、自分自身の複数リポジトリ運用では日常的に使っている。

興味があればぜひ触ってみてほしい。Issue や PR も歓迎。

https://github.com/tktcorporation/ziku

```bash
npx ziku
```

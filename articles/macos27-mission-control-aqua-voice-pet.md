---
title: "macOS 27 で Mission Control のサムネイルが壁紙だけになる原因は Aqua Voice のペット機能だった"
emoji: "🪟"
type: "tech"
topics: ["macos", "aquavoice", "missioncontrol", "swift", "troubleshooting"]
published: true
---

## TL;DR

- 症状は、macOS 27.0.1 で Mission Control の上部（Spaces バー）にあるデスクトップのサムネイルに壁紙しか映らず、どのウィンドウがどこにあるか分からなくなること。
- 原因は音声入力アプリ Aqua Voice（0.21.4）の新しいペット機能。有効にすると、メニューバーの下のほぼ全域を覆う透明なウィンドウが常時表示される。別のアプリで報告された同種の不具合では、画面いっぱいの透明オーバーレイを macOS 27 が「全画面ウィンドウ」として扱い、サムネイルからウィンドウが消えていた。ただし今回のウィンドウは、その不具合で分かっている条件（ウィンドウの大きさと重なり順）を満たしていない。macOS 27 がどう判定しているかは確かめていない。
- 回避策は、ペット機能をオフにする（または Aqua Voice を終了する）こと。すぐに直る。根本対策は、アプリ側でほぼ画面いっぱいのオーバーレイを常時出さないこと（似た不具合は、オーバーレイを分割して直った）。

## 症状

Mission Control を開いて画面上端にマウスを寄せると、Spaces バーが広がって各デスクトップのサムネイルが出ます。そのサムネイルに壁紙しか描かれず、ウィンドウが1つも映らなくなりました。画面中央の「今のデスクトップのウィンドウ一覧」は普通に表示されます。

いちばん奇妙だったのは、**再起動すると一瞬直り、約 30 秒後にまた壁紙だけに戻る**ことです。

| 項目 | 内容 |
| --- | --- |
| OS | macOS 27.0.1 (26A434) |
| 機種 | MacBook Pro (M1 Max, 14 インチ、内蔵ディスプレイのみ) |
| デスクトップ数 | 5 |
| ステージマネージャ | オフ |
| 原因だったアプリ | Aqua Voice 0.21.4（ペット機能を有効にした状態） |

## 効かなかったこと

ネットでよく見る対処は、どれも効きませんでした。原因が別のアプリにあるので、OS 側をいくらリセットしても直らないのは当然でした。

| 試したこと | 結果 |
| --- | --- |
| `killall Dock` で Dock（Mission Control を描いているプロセス）を再起動 | 変化なし |
| `control + →` で全デスクトップを一度ずつ巡回してスナップショットを撮らせる | 変化なし |
| Spaces の設定ファイル `com.apple.spaces` を退避して削除し、Dock を再起動 | 変化なし（ログイン中は、画面描画を担う WindowServer が構成を持ち続けるので、そもそもリセットされない） |
| 再起動 | 一瞬直るが、約 30 秒で再発 |
| ステージマネージャやサードパーティのウィンドウ管理ツールの確認 | どちらも使っていなかった |

## 手がかり: 再起動直後だけ直る

「再起動直後は正常で、約 30 秒後に壊れる」なら、OS の設定ではなく、**ログイン後に少し遅れて起動する何か**が壊していると考えられます。そこで、ユーザープロセスを開始時刻順に並べました。

```bash
# 自分のプロセスを開始時刻順に並べ、Apple 純正のものを除く
ps -U "$USER" -o lstart=,comm= \
  | grep -v -E '/System/|/usr/(libexec|sbin|bin)/|/Library/Apple/' \
  | sort -k4,4
```

結果を抜粋すると、次のようになりました。ログインから約 30 秒後に、常駐系のアプリがまとめて立ち上がっています。

| ログインからの経過 | 起動したもの |
| --- | --- |
| +1〜2 秒 | ログイン時に開くアプリ群（ブラウザ、エディタなど） |
| +3 秒 | Dock（Mission Control を描くプロセス） |
| +22 秒 | 別の常駐アプリのバックグラウンドサービス |
| +30 秒 | **Aqua Voice**、Raycast、Cloudflare WARP などの常駐アプリ |
| +34 秒 | Aqua Voice の補助プロセス（AquaMacOSBridge） |

壊れるまでの約 30 秒は、常駐アプリの起動した +30 秒前後とぴったり重なります。この時点で容疑者は数個に絞れました。

## Web で見つけた同種の不具合

ぴったり同じ症状の報告が、macOS ユーティリティ [Vorssaint の Issue #3292](https://github.com/vorssaint/vorssaint-utils/issues/3292) にありました（2026 年 10 月 20 日報告）。macOS 27.0.1 (26A434) で「Extra Brightness」をオンにすると、Mission Control のデスクトップのサムネイルが壁紙だけになる、という内容です。

修正した [Pull Request #3293](https://github.com/vorssaint/vorssaint-utils/pull/3293) に、仕組みの分析が書かれています。

- Extra Brightness は、**画面全体を覆う枠なしのオーバーレイウィンドウを全デスクトップに**出していた
- AppKit は、条件を満たすウィンドウを WindowManager に「全画面ウィンドウ」（presentation mode 3）として伝える。条件は 2 つで、ウィンドウの枠が画面の安全領域（`safeAreaFrame`。メニューバーやノッチに隠れない範囲）を含むことと、ウィンドウレベル（重なり順。大きいほど手前）が 24 より上であること
- その「全画面ウィンドウ」が全デスクトップにあるため、サムネイルに通常のウィンドウが描かれなくなる（PR 作者の推測、Mission Control での直接確認は未実施とのこと）
- 修正は、オーバーレイを**画面の上半分と下半分の 2 枚に分ける**こと。どちらも安全領域を含まないので、普通のウィンドウとして扱われる（Vorssaint 3.4.2 で配布）

PR の計測では、`sharingType` や collection behavior といったウィンドウの設定を変えても、判定は変わりませんでした。レベルを 24 以下にするか、ウィンドウを 1pt でも小さくすると、普通のウィンドウに戻るそうです。つまり、「画面いっぱいの透明オーバーレイを出すアプリ」なら、どれでも同じ問題を起こし得ます。

## 犯人の特定: 画面いっぱいのウィンドウを探す

Vorssaint の分析を踏まえ、「画面いっぱいのウィンドウを持っているアプリ」を `CGWindowListCopyWindowInfo` で探しました。ウィンドウの持ち主・レベル・大きさは、画面収録の権限がなくても取れます。

注意点が 1 つあります。ノッチ付きの MacBook では、安全領域はノッチの帯を除いた範囲です。そのため、「画面全体と同じ大きさ」ではなく、「安全領域くらいの大きさ」のウィンドウを探す必要があります。最初に画面全体サイズで探したときは 0 件で、見落とすところでした。

```swift
// windows.swift — `swift windows.swift` で実行
import AppKit

for s in NSScreen.screens {
    print("screen:", s.frame, "top inset:", s.safeAreaInsets.top)
}
let list = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as! [[String: Any]]
for w in list {
    let layer = w[kCGWindowLayer as String] as? Int ?? 0
    guard layer > 0, let b = w[kCGWindowBounds as String] as? [String: CGFloat] else { continue }
    // 通常のウィンドウ (layer 0) より手前にある、大きなウィンドウだけを表示する
    if (b["Width"] ?? 0) >= 1000 && (b["Height"] ?? 0) >= 600 {
        print("layer=\(layer) owner=\(w[kCGWindowOwnerName as String] ?? "?")",
              "y=\(b["Y"] ?? 0) size=\(Int(b["Width"] ?? 0))x\(Int(b["Height"] ?? 0))",
              "onscreen=\(w[kCGWindowIsOnscreen as String] ?? false)")
    }
}
```

結果は次のとおりです。画面は 1512×982 で、ノッチ分の上部 32pt を除いた安全領域は 1512×950 です。

```text
layer=20 owner=Dock y=0.0 size=1512x982 onscreen=false
layer=21 owner=通知センター y=0.0 size=1512x982 onscreen=false
layer=3 owner=Aqua Voice y=33.0 size=1512x949 onscreen=1
```

Dock と通知センターは非表示です。常に画面に出ているのは、**Aqua Voice の、メニューバーの下のほぼ全域を覆うウィンドウ**だけでした。起動時刻も「約 30 秒後」と一致します。

確認として Aqua Voice を終了すると、サムネイルにウィンドウが戻りました。さらに切り分けると、Aqua Voice の新しい**ペット機能を有効にしたときだけ**起きることが分かりました。ペットが画面上を動き回るための透明なキャンバスが、このウィンドウだと考えられます。

なお、このウィンドウは Vorssaint の PR が示した条件をどちらも満たしていません。レベル（出力の `layer`）は 3 で、「24 より上」ではありません。大きさも y=33 から高さ 949pt で、安全領域（y=32 から高さ 950pt）より 1pt 小さくなっています。macOS 27 の判定には別の経路もありそうですが、そこまでは確かめていません。

## 回避策と根本対策

当面は、**Mission Control を使いたいときは Aqua Voice のペット機能をオフにする**のがいちばん手軽です。音声入力そのものはそのまま使えます。

根本的には、アプリ側でオーバーレイの出し方を変える必要があります。ほぼ画面いっぱいのウィンドウを常時出さないようにすれば直る見込みです。Vorssaint は上下 2 枚に分けて直しましたが、同じ方法が Aqua Voice のウィンドウにも効くかは確かめられていません。ペットの周りだけの小さなウィンドウを動かす方式でも回避できるでしょう。この件は Aqua Voice の開発元にも報告する予定です。

自分でオーバーレイを出すアプリを作っている人は、macOS 27 では「ほぼ画面いっぱいの大きさのウィンドウを常時出さない」ようにしておくと安全です。

## 同じ症状になった人へ: 原因アプリの探し方

Aqua Voice を使っていなくても、画面いっぱいのオーバーレイを出すアプリ（画面の明るさ調整、アノテーション、デスクトップペットなど）なら同じことが起き得ます。次の順に切り分けると、数分で原因にたどり着けます。

1. 再起動して、ログイン直後に Mission Control を開く。ここで正常なら、ログイン後に起動する何かが原因
2. 上の Swift スクリプトを実行し、`onscreen=1` で、大きさが安全領域とほぼ同じかそれ以上のウィンドウを探す
3. そのウィンドウの持ち主のアプリを終了し、Mission Control で直るか確かめる
4. 直ったら、そのアプリの中のどの機能がオーバーレイを出しているか、機能ごとにオン・オフして絞り込む

スクリプトで見つからないときは、「システム設定 > 一般 > ログイン項目」のアプリを半分ずつ終了して試す二分探索が確実です。

## 参考リンク

- [\[Bug\]: Extra Brightness hides window previews in Mission Control desktop thumbnails on macOS 27 — vorssaint/vorssaint-utils #3292](https://github.com/vorssaint/vorssaint-utils/issues/3292)
- [fix(display): keep windows in Mission Control's desktop thumbnails with Extra Brightness on — vorssaint/vorssaint-utils #3293](https://github.com/vorssaint/vorssaint-utils/pull/3293)
- [black window drawn on second display with 0 alpha blacks out Mission Control preview — VLC #9106](https://code.videolan.org/videolan/vlc/-/issues/9106)（古い macOS での「透明なウィンドウがプレビューを隠す」例）
- [Mission Control graphic issue — Apple Community](https://discussions.apple.com/thread/7670544)（セーフモードとログイン項目で切り分ける方法）

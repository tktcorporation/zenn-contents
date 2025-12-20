---
title: "macOS Tahoe アップデート後に Aqua Voice のショートカットが効かなくなった"
emoji: "🎤"
type: "tech"
topics: ["macos", "aquavoice", "troubleshooting"]
published: true
---

## 現象

macOS Tahoe 26.2 にアップデートしたところ、Aqua Voice のグローバルショートカットキーが反応しなくなった。

Raycast のショートカットは正常に動作していた。

## 環境

- macOS Tahoe 26.2
- Aqua Voice 0.11.4
- ショートカット設定: 左Control + 左Command

## やったこと

1. **システム設定** を開く
2. **プライバシーとセキュリティ** → **入力監視** を選択
3. Aqua Voice を許可対象に追加
4. アプリを再起動

これで動くようになった。

## わからないこと

- 元々この設定をしていた記憶がない。アップデートでリセットされたのか、今回から必要になったのかは不明
- Raycast は入力監視の設定をしていないのに動いている。なぜ Aqua Voice だけこの設定が必要なのかはわかっていない
- もっと良い解決方法があるかもしれないが、とりあえずこれで直った

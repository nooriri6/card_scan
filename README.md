# MTG Card Scanner

AndroidとiOSで動作するMTGカードスキャナーアプリです。端末のカメラを使用してMTGカードを撮影し、自動的にカードを検出・切り出し・補正して保存します。

## 機能

- **カメラ撮影**: 端末のカメラを使用してMTGカードを撮影
- **自動カード検出**: カメラにカードが映ると自動的に検出して撮影
- **カード変更検出**: カードの絵が変わると自動的に検出して撮影
- **自動切り出し**: 撮影した画像からカード部分のみを自動切り出し
- **歪み補正**: カード画像の歪みを補正して保存
- **ギャラリー表示**: 保存したカード画像の一覧表示
- **画像管理**: 個別削除・全削除機能
- **デバッグモード**: 検出パラメータをリアルタイムで確認

## 技術スタック

- **React Native**: クロスプラットフォーム開発フレームワーク
- **Expo**: React Nativeの開発・ビルドツール
- **TypeScript**: 型安全な開発
- **expo-camera**: カメラ機能
- **expo-image-manipulator**: 画像処理・補正
- **expo-file-system**: ファイル保存
- **expo-media-library**: メディアライブラリへの保存
- **jpeg-js**: JPEG画像のデコード（カード検出用）

## 必要な環境

### 共通
- Node.js 18以上
- npm または yarn

### Android開発
- Android Studio
- Android SDK
- Java Development Kit (JDK)

### iOS開発
- macOS
- Xcode 14以上
- CocoaPods

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd MTGCardScanner
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Expoの設定

Expo Goアプリを使用する場合は、スマートフォンにExpo Goアプリをインストールしてください。

- [iOS版 Expo Go](https://apps.apple.com/app/expo-go/id982107779)
- [Android版 Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)

## 開発モードでの実行

### Expo Goを使用する場合（推奨）

```bash
npm start
```

QRコードが表示されるので、スマートフォンのExpo Goアプリでスキャンしてください。

### Androidエミュレータで実行

```bash
npm run android
```

### iOSシミュレータで実行（macOSのみ）

```bash
npm run ios
```

## ビルド

### Android APKのビルド

1. EAS CLIのインストール:
```bash
npm install -g eas-cli
```

2. Expoアカウントでログイン:
```bash
eas login
```

3. プロジェクトの設定:
```bash
eas build:configure
```

4. Androidビルドの実行:
```bash
eas build --platform android --profile preview
```

ビルドが完了すると、APKファイルのダウンロードリンクが表示されます。

### iOSアプリのビルド（macOSのみ）

1. EAS CLIのインストール（上記と同じ）

2. iOSビルドの実行:
```bash
eas build --platform ios --profile preview
```

または、ローカルでビルドする場合:

```bash
npx expo prebuild
cd ios
pod install
cd ..
npx expo run:ios
```

## プロジェクト構造

```
MTGCardScanner/
├── App.tsx                 # メインアプリケーションファイル
├── app.json               # Expo設定ファイル
├── src/
│   ├── screens/
│   │   ├── CameraScreen.tsx    # カメラ画面（自動検出・状態管理）
│   │   └── GalleryScreen.tsx   # ギャラリー画面
│   ├── utils/
│   │   ├── cardDetection.ts    # カード検出アルゴリズム（dHash、エッジ密度）
│   │   ├── imageProcessing.ts  # 画像処理ユーティリティ
│   │   └── storage.ts          # ストレージ管理
│   └── types/
│       └── index.ts            # TypeScript型定義
├── assets/                # 画像・アイコン
├── package.json
└── tsconfig.json
```

## 使い方

### カメラ画面

1. **自動撮影開始**: カードを自動検出して撮影します。カメラにカードが映ると自動的に撮影し、カードの絵が変わると再度撮影します。
2. **撮影**: 単発でカードを撮影します。
3. **撮影停止**: 自動撮影を停止します。
4. **デバッグモード**: トグルをONにすると、検出状態、エッジ密度、ハミング距離、安定性カウンタをリアルタイムで表示します。
5. **ギャラリーを見る**: 保存したカード画像の一覧を表示します。

### ギャラリー画面

- **画像の表示**: 保存したカード画像を一覧表示します。
- **画像の削除**: 画像を長押しすると削除できます。
- **全削除**: 右上の「全削除」ボタンですべての画像を削除できます。
- **更新**: 下にスワイプして画像リストを更新できます。
- **カメラに戻る**: 下部のボタンでカメラ画面に戻ります。

## 画像処理の仕組み

### カード検出アルゴリズム

アプリは以下の手順でカードを自動検出・処理します：

#### 1. リアルタイム検出（400msごと）
- 低解像度画像（quality: 0.2）を撮影
- ROI（Region of Interest）領域を128x128にリサイズ
- エッジ密度とdHash（パーセプチュアルハッシュ）を計算

#### 2. カード存在検出
- **エッジ密度**: Sobelライクな勾配計算でエッジピクセルを検出
- **閾値**: エッジ密度が8%以上でカードが存在すると判定
- **安定性**: 3フレーム連続でカードが検出されたら撮影

#### 3. カード変更検出
- **dHash**: 9x8グレースケール画像から64ビットのハッシュを生成
- **ハミング距離**: 前回撮影したカードとのハッシュ差分を計算
- **閾値**: ハミング距離が15以上で異なるカードと判定
- **安定性**: 2フレーム連続で変更が検出されたら撮影

#### 4. 状態管理
- **Idle**: カード未検出状態
- **CandidatePresent**: カード候補を検出中（安定性確認中）
- **CaptureOnce**: 高解像度撮影を実行
- **WaitForChange**: カード変更を待機中

#### 5. 高解像度撮影と保存
- カード検出後、高解像度（quality: 0.9）で撮影
- カード部分を切り出し
- 透視変換で歪みを補正
- 標準サイズ（480x672px）にリサイズ
- 端末のストレージとメディアライブラリに保存
- 1秒のクールダウンで連続撮影を防止

### 検出パラメータ

以下のパラメータで検出精度を調整しています：

- **検出間隔**: 400ms
- **エッジ密度閾値**: 8%
- **ハミング距離閾値**: 15ビット
- **カード存在の安定性**: 3フレーム
- **カード変更の安定性**: 2フレーム
- **撮影後のクールダウン**: 1000ms

デバッグモードをONにすると、これらのパラメータの動作をリアルタイムで確認できます。

## トラブルシューティング

### カメラが起動しない
- アプリにカメラの権限が付与されているか確認してください
- 端末の設定からアプリの権限を確認できます

### 画像が保存されない
- アプリにストレージの権限が付与されているか確認してください
- 端末のストレージ容量を確認してください

### ビルドエラー
- `npm install`を実行して依存関係を再インストールしてください
- `node_modules`と`package-lock.json`を削除してから再インストールしてください

```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScriptエラー
型チェックを実行してエラーを確認できます：

```bash
npx tsc --noEmit
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 開発者情報

- Expo SDK: 54.0.20
- React Native: 0.81.5
- TypeScript: 5.9.2

## サポート

問題が発生した場合は、GitHubのIssuesセクションで報告してください。

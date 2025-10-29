# MTG Card Scanner

AndroidとiOSで動作するMTGカードスキャナーアプリです。端末のカメラを使用してMTGカードを撮影し、自動的にカードを検出・切り出し・補正して保存します。

## 機能

- **カメラ撮影**: 端末のカメラを使用してMTGカードを撮影
- **連続撮影**: カードが変わったことを自動検出して連続で撮影
- **自動切り出し**: 撮影した画像からカード部分のみを自動切り出し
- **歪み補正**: カード画像の歪みを補正して保存
- **ギャラリー表示**: 保存したカード画像の一覧表示
- **画像管理**: 個別削除・全削除機能

## 技術スタック

- **React Native**: クロスプラットフォーム開発フレームワーク
- **Expo**: React Nativeの開発・ビルドツール
- **TypeScript**: 型安全な開発
- **expo-camera**: カメラ機能
- **expo-image-manipulator**: 画像処理・補正
- **expo-file-system**: ファイル保存
- **expo-media-library**: メディアライブラリへの保存

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
│   │   ├── CameraScreen.tsx    # カメラ画面
│   │   └── GalleryScreen.tsx   # ギャラリー画面
│   ├── utils/
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

1. **連続撮影開始**: カードを連続で撮影します。カードが変わると自動的に検出して撮影します。
2. **撮影**: 単発でカードを撮影します。
3. **撮影停止**: 連続撮影を停止します。
4. **ギャラリーを見る**: 保存したカード画像の一覧を表示します。

### ギャラリー画面

- **画像の表示**: 保存したカード画像を一覧表示します。
- **画像の削除**: 画像を長押しすると削除できます。
- **全削除**: 右上の「全削除」ボタンですべての画像を削除できます。
- **更新**: 下にスワイプして画像リストを更新できます。
- **カメラに戻る**: 下部のボタンでカメラ画面に戻ります。

## 画像処理の仕組み

### カード検出
アプリは以下の手順でカードを検出・処理します：

1. **エッジ検出**: 画像からカードの輪郭を検出
2. **切り出し**: 検出した輪郭に基づいてカード部分を切り出し
3. **透視変換**: カードの歪みを補正して正面から見た形に変換
4. **リサイズ**: 標準サイズ（480x672px）にリサイズ
5. **保存**: 端末のストレージとメディアライブラリに保存

### カード変更検出
連続撮影モードでは、以下の方法でカードの変更を検出します：

- 2秒ごとに画像を撮影
- 前回の画像と比較して差分を計算
- 差分が閾値（15%）を超えた場合、新しいカードとして保存

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

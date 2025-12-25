# RAG App - AI 検索アプリケーション

テキストを登録して AI で検索できる RAG（Retrieval-Augmented Generation）アプリケーションです。

## 機能

- **テキスト登録**: 任意のテキストをデータベースに登録
- **AI 検索**: 登録されたテキストから関連情報を検索し、AI が回答を生成
- **ベクトル検索**: pgvector を使用した高速な類似検索

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, Node.js
- **データベース**: PostgreSQL + pgvector
- **LLM**: OpenAI API（ローカル開発）/ AWS Bedrock（本番環境）
- **インフラ**: Docker, Docker Compose

## ディレクトリ構造

```
rag-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── register/      # テキスト登録API
│   │   │   └── search/        # 検索&回答生成API
│   │   ├── register/          # テキスト登録ページ
│   │   ├── layout.tsx         # ルートレイアウト
│   │   ├── page.tsx           # ホームページ（検索画面）
│   │   └── globals.css        # グローバルスタイル
│   ├── components/
│   │   ├── ui/                # 再利用可能なUIコンポーネント
│   │   └── features/          # 機能別コンポーネント
│   ├── lib/
│   │   ├── db.ts             # データベース接続
│   │   ├── embedding.ts       # 埋め込み生成
│   │   └── llm.ts            # LLM呼び出し
│   └── types/                 # TypeScript型定義
├── scripts/
│   └── init-db.sql           # DB初期化スクリプト
├── docker-compose.yml         # Docker設定
├── .env.local                 # 環境変数（ローカル）
└── package.json
```

## 環境構築手順

### 1. 前提条件

- Node.js 18 以上
- Docker & Docker Compose
- OpenAI API キー（ローカル開発用）

### 2. リポジトリのクローン

```bash
git clone <repository-url>
cd rag-app
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 環境変数の設定

`.env.local` ファイルを編集して、OpenAI API キーを設定します：

```bash
# .env.local
DATABASE_URL=postgresql://raguser:ragpassword@localhost:5432/ragdb

# LLM Provider (openai or bedrock)
LLM_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here  # ← ここにあなたのAPIキーを設定
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 5. PostgreSQL + pgvector の起動

```bash
docker-compose up -d
```

データベースが起動するまで少し待ちます（10 秒程度）：

```bash
# データベースの状態を確認
docker-compose ps
```

### 6. アプリケーションの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスします。

## 使い方

### テキストの登録

1. ナビゲーションバーの「テキスト登録」をクリック
2. テキストエリアに登録したいテキストを入力
3. 「登録する」ボタンをクリック

### AI 検索

1. ホームページ（検索画面）で質問を入力
2. 「検索する」ボタンをクリック
3. AI が登録されたテキストから関連情報を検索して回答を生成

## AWS Bedrock への切り替え

本番環境で AWS Bedrock を使用する場合：

### 1. 環境変数の変更

`.env.local` を以下のように変更：

```bash
# LLM Provider
LLM_PROVIDER=bedrock

# AWS Bedrock Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-text-v2:0
```

### 2. データベーススキーマの変更

Bedrock の Titan Embed Text v2 は 1024 次元のベクトルを使用するため、データベーススキーマを変更する必要があります：

```sql
-- PostgreSQLに接続
docker exec -it rag-app-postgres psql -U raguser -d ragdb

-- テーブルを削除して再作成
DROP TABLE documents;

CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  embedding vector(1024) NOT NULL,  -- 1536 → 1024に変更
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX documents_embedding_idx ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### 3. アプリケーションの再起動

```bash
npm run dev
```

## トラブルシューティング

### データベース接続エラー

```bash
# PostgreSQLコンテナのログを確認
docker-compose logs postgres

# コンテナを再起動
docker-compose restart postgres
```

### OpenAI API エラー

- `.env.local` の API キーが正しいか確認
- OpenAI のアカウントに十分なクレジットがあるか確認

### ポート競合エラー

PostgreSQL のポート 5432 が既に使用されている場合：

```yaml
# docker-compose.yml を編集
services:
  postgres:
    ports:
      - "5433:5432"  # ← ホスト側のポートを変更

# .env.local も変更
DATABASE_URL=postgresql://raguser:ragpassword@localhost:5433/ragdb
```

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm start

# Lintチェック
npm run lint

# Dockerコンテナ停止
docker-compose down

# Dockerコンテナ停止＋ボリューム削除（データも削除）
docker-compose down -v
```

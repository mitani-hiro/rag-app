# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

テキストを登録してAIで検索できるRAG（Retrieval-Augmented Generation）アプリケーション。ベクトル埋め込みによる意味検索とLLMによる回答生成を実装。

## 主要コマンド

```bash
# 開発
npm run dev                    # 開発サーバー起動（Turbopack使用）
npm run build                  # プロダクションビルド
npm start                      # プロダクションサーバー起動
npm run lint                   # ESLint実行

# データベース
docker-compose up -d           # PostgreSQL + pgvector起動
docker-compose down            # データベース停止
docker-compose down -v         # データベース停止＋データ削除
docker-compose ps              # コンテナ状態確認
docker-compose logs postgres   # データベースログ確認

# データベース接続（手動SQL実行用）
docker exec -it rag-app-postgres psql -U raguser -d ragdb
```

## アーキテクチャ

### LLMプロバイダー抽象化

`LLM_PROVIDER` 環境変数で2つのLLMプロバイダーを切り替え可能：
- **OpenAI**（デフォルト、ローカル開発用）
- **AWS Bedrock**（本番環境用、Claudeモデル使用）

プロバイダーロジックは `/src/lib/embedding.ts` と `/src/lib/llm.ts` に集約され、自動的にリクエストを適切なプロバイダーにルーティング。プロバイダー切り替え時は**データベーススキーマの変更が必須**（埋め込みベクトルの次元数が異なるため）：
- OpenAI text-embedding-3-small: 1536次元
- AWS Bedrock Titan Embed Text v2: 1024次元

### データフロー

**登録フロー:**
1. クライアント → POST `/api/register` → `RegisterForm.tsx`
2. APIが `generateEmbedding()` で埋め込みを生成（OpenAIまたはBedrockにルーティング）
3. `saveDocument()` でドキュメント＋埋め込みをPostgreSQLに保存

**検索フロー:**
1. クライアント → POST `/api/search` → `SearchForm.tsx`
2. `generateEmbedding()` でクエリを埋め込みに変換
3. `searchSimilarDocuments()` でpgvectorのコサイン距離演算子（`<=>`）を使用しベクトル類似検索
4. 上位K件をコンテキストとして `generateAnswer()` でLLMに渡す
5. AI生成回答をソースドキュメントと共にクライアントに返却

### データベーススキーマ

`documents` テーブルの構造:
- `id`: プライマリキー
- `text`: 元のドキュメントテキスト
- `embedding`: ベクトル埋め込み（次元数はLLMプロバイダーに依存）
- `created_at`: タイムスタンプ

pgvector拡張を使用し、HNSWインデックス（`vector_cosine_ops`）で高速コサイン類似検索を実現。データベース初期化は `/scripts/init-db.sql` がdocker-composeにマウントされ自動実行。

### コアライブラリモジュール

- **`/src/lib/db.ts`**: PostgreSQL接続プール、ドキュメントCRUD、pgvectorを使用したベクトル検索
- **`/src/lib/embedding.ts`**: プロバイダー抽象化による埋め込み生成（OpenAI/Bedrock）
- **`/src/lib/llm.ts`**: プロバイダー抽象化による回答生成（OpenAI GPT/Bedrock Claude）

### コンポーネント構成

- **`/src/components/ui/`**: 再利用可能なUIプリミティブ（Button、Card、Input、Textarea）
- **`/src/components/features/`**: 機能別コンポーネント（RegisterForm、SearchForm）
- **`/src/app/`**: Next.js App Routerのページ＋APIルート

## 重要な実装ノート

### LLMプロバイダーの切り替え

`LLM_PROVIDER` を `openai` から `bedrock` に変更する場合:

1. `.env.local` の環境変数を更新
2. **正しい埋め込み次元数でdocumentsテーブルを再作成**:
   ```sql
   DROP TABLE documents;
   CREATE TABLE documents (
     id SERIAL PRIMARY KEY,
     text TEXT NOT NULL,
     embedding vector(1024) NOT NULL,  -- 1536から変更
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   CREATE INDEX documents_embedding_idx ON documents
   USING hnsw (embedding vector_cosine_ops);
   ```

### 環境変数

すべての設定は `.env.local` で管理（テンプレートは `.env.example` を参照）。主要な変数:
- `DATABASE_URL`: PostgreSQL接続文字列
- `LLM_PROVIDER`: "openai" または "bedrock"
- OpenAI用: `OPENAI_API_KEY`、`OPENAI_MODEL`、`OPENAI_EMBEDDING_MODEL`
- Bedrock用: `AWS_REGION`、`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、`BEDROCK_MODEL_ID`、`BEDROCK_EMBEDDING_MODEL_ID`

### パスエイリアス

TypeScriptは `@/*` エイリアスを `./src/*` にマッピング。インポートをクリーンに保つため使用。

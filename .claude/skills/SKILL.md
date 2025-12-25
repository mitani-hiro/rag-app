---
name: rag-app-assistant
description: Assist with RAG (Retrieval-Augmented Generation) application development using Next.js, PostgreSQL with pgvector, and LLM APIs. Use when working with document registration, vector embeddings, semantic search, or AI-powered question answering features.
---

# RAG App Assistant

このスキルは、Next.js ベースの RAG（Retrieval-Augmented Generation）アプリケーションの開発をサポートします。

## 概要

このプロジェクトは、以下の技術スタックを使用しています：

- **フロントエンド**: Next.js (App Router) + React + TypeScript + Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL + pgvector（ベクトル検索）
- **LLM**: OpenAI (デフォルト) または AWS Bedrock
- **埋め込みモデル**:
  - OpenAI: text-embedding-3-small (1536 次元)
  - AWS Bedrock: amazon.titan-embed-text-v2:0 (1024 次元)

## 主要な機能

### 1. テキスト登録機能

- ユーザーが入力したテキストを登録
- 自動的に埋め込みベクトルを生成
- PostgreSQL に保存

### 2. AI 検索 & 回答生成

- ユーザーの質問を埋め込み化
- pgvector でコサイン類似度検索
- 関連文書を LLM に渡して回答を生成

**重要**: LLM プロバイダーを変更する場合、埋め込み次元数も変更する必要があります：

- OpenAI: 1536 次元
- AWS Bedrock: 1024 次元

`scripts/init-db.sql` の `vector(1536)` を適切な次元数に変更してください。

## RAG の仕組み

### テキスト登録フロー

ユーザーがテキストを登録する際の処理フロー：

1. **ユーザー入力** → フロントエンド (`src/components/features/register/RegisterForm.tsx`)
2. **API リクエスト** → `POST /api/register` (`src/app/api/register/route.ts`)
3. **埋め込み生成** → `generateEmbedding()` 関数 (`src/lib/embedding.ts`)
   - OpenAI の場合: `text-embedding-3-small` モデル (1536次元)
   - Bedrock の場合: `amazon.titan-embed-text-v2:0` モデル (1024次元)
4. **データベース保存** → `saveDocument()` 関数 (`src/lib/db.ts`)
   - PostgreSQL の `documents` テーブルに `text` と `embedding` を保存
   - pgvector 拡張により、ベクトルデータを効率的に格納

### 質問 → 回答生成フロー（RAG）

ユーザーが質問して回答を得るまでの処理フロー：

1. **ユーザーが質問を入力** → フロントエンド (`src/components/features/search/SearchForm.tsx`)
2. **API リクエスト** → `POST /api/search` (`src/app/api/search/route.ts`)
3. **質問の埋め込み生成** → `generateEmbedding()` 関数 (`src/lib/embedding.ts`)
   - 質問文を1536次元（または1024次元）のベクトルに変換
4. **ベクトル類似検索** → `searchSimilarDocuments()` 関数 (`src/lib/db.ts`)
   - pgvector の `<=>` オペレータでコサイン類似度検索を実行
   - HNSW インデックスを使用して高速検索（小規模データセットでも効率的）
   - 類似度の高い上位 k 件（デフォルト: 5件）の文書を取得
   - SQL クエリ例:
     ```sql
     SELECT id, text, 1 - (embedding <=> $1) AS similarity
     FROM documents
     ORDER BY embedding <=> $1
     LIMIT $2
     ```
5. **コンテキスト構築** → 検索結果を結合 (`src/app/api/search/route.ts:39-41`)
   - 取得した文書を `[文書1] テキスト内容\n\n[文書2] テキスト内容...` の形式で結合
6. **LLM で回答生成** → `generateAnswer()` 関数 (`src/lib/llm.ts`)
   - **プロンプト構成**:
     ```
     【参考情報】
     [検索で取得した関連文書のテキスト]

     【質問】
     [ユーザーの質問]

     【回答】
     ```
   - OpenAI の場合: `gpt-4o-mini` モデル（デフォルト）
   - Bedrock の場合: `anthropic.claude-3-5-sonnet-20241022-v2:0` モデル（デフォルト）
   - temperature: 0.7, max_tokens: 1000
7. **回答を返却** → ユーザーに表示

### 処理の流れ（まとめ）

```
【登録】
テキスト入力 → 埋め込み生成 → PostgreSQL保存

【検索・回答生成】
質問入力 → 質問の埋め込み生成 → pgvectorで類似検索
→ 関連文書を取得 → LLMに質問+関連文書を渡す → 回答生成 → 表示
```

### 重要なファイル

- **API Routes**
  - `src/app/api/register/route.ts` - テキスト登録 API
  - `src/app/api/search/route.ts` - 検索・回答生成 API
- **ライブラリ**
  - `src/lib/embedding.ts` - 埋め込み生成（OpenAI/Bedrock 自動切り替え）
  - `src/lib/llm.ts` - LLM 回答生成（OpenAI/Bedrock 自動切り替え）
  - `src/lib/db.ts` - PostgreSQL 操作（登録、検索）
- **データベース**
  - `scripts/init-db.sql` - テーブル定義とインデックス作成
  - インデックス: HNSW（小規模データでも高性能）

### DB 検索と LLM の使い分け

1. **ベクトル検索（pgvector）の役割**
   - 大量の文書から、質問に関連する文書を**高速に絞り込む**
   - ベクトル空間上でのコサイン類似度で関連性を判定
   - LLM のコンテキストウィンドウに収まる量に削減

2. **LLM の役割**
   - 絞り込まれた関連文書を理解し、質問に対して**自然な回答を生成**
   - 単なる検索結果の羅列ではなく、文脈を考慮した回答を作成
   - 情報を統合し、分かりやすく説明

この組み合わせにより、大規模なデータから正確な情報を見つけ出し、自然な言葉で回答できる RAG システムが実現されています。

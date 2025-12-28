-- pgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- documentsテーブルを作成
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  embedding vector(1024) NOT NULL, -- AWS Bedrock Titan Embed Text v2 のベクトル次元数
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ベクトル類似検索用のインデックスを作成
-- HNSWは小規模データセットでも高性能に動作します
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents
USING hnsw (embedding vector_cosine_ops);

-- テスト用のサンプルデータ（オプション）
-- INSERT INTO documents (text, embedding) VALUES
-- ('サンプルテキスト', '[0,0,0,...]'); -- 実際には1536次元のベクトル

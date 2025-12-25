import { Pool, QueryResult } from "pg";
import pgvector from "pgvector/pg";
import type { Document, SearchResult } from "@/types";

// データベース接続プールを作成
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// pgvectorの型を登録
pool.on("connect", async (client) => {
  await pgvector.registerType(client);
});

// データベース接続をテスト
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log("Database connection successful");
    return true;
  } catch (error) {
    console.error("Database connection error:", error);
    return false;
  }
}

// ドキュメントを保存
export async function saveDocument(
  text: string,
  embedding: number[]
): Promise<number> {
  const client = await pool.connect();
  try {
    // pgvectorを使ってベクトルをPostgreSQLの形式に変換
    await pgvector.registerType(client);
    const result: QueryResult = await client.query(
      "INSERT INTO documents (text, embedding) VALUES ($1, $2) RETURNING id",
      [text, pgvector.toSql(embedding)]
    );
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

// ベクトル類似検索
export async function searchSimilarDocuments(
  queryEmbedding: number[],
  topK: number = 5
): Promise<SearchResult[]> {
  const client = await pool.connect();
  try {
    // pgvectorの型を登録
    await pgvector.registerType(client);

    console.log("Searching with vector dimension:", queryEmbedding.length);

    const query = `
      SELECT
        id,
        text,
        1 - (embedding <=> $1) AS similarity
      FROM documents
      ORDER BY embedding <=> $1
      LIMIT $2
    `;

    const result: QueryResult = await client.query(query, [
      pgvector.toSql(queryEmbedding),
      topK,
    ]);

    console.log("Search results count:", result.rows.length);
    if (result.rows.length > 0) {
      console.log("Top result similarity:", result.rows[0].similarity);
      console.log(
        "Top result text preview:",
        result.rows[0].text.substring(0, 50)
      );
    }

    return result.rows.map((row) => ({
      id: row.id,
      text: row.text,
      similarity: parseFloat(row.similarity),
    }));
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// 全ドキュメントを取得（デバッグ用）
export async function getAllDocuments(): Promise<Document[]> {
  const client = await pool.connect();
  try {
    const result: QueryResult = await client.query(
      "SELECT id, text, created_at FROM documents ORDER BY created_at DESC"
    );
    return result.rows;
  } finally {
    client.release();
  }
}

// データベース接続を閉じる
export async function closeConnection(): Promise<void> {
  await pool.end();
}

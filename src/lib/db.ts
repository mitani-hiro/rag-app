import { Pool, QueryResult } from "pg";
import pgvector from "pgvector/pg";
import type { Document, SearchResult, DocumentSummary, DocumentCluster } from "@/types";

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

// ドキュメント一覧を取得（プレビュー付き）
export async function getDocumentSummaries(limit: number = 100, offset: number = 0): Promise<{ documents: DocumentSummary[]; total: number }> {
  const client = await pool.connect();
  try {
    // 総件数を取得
    const countResult = await client.query("SELECT COUNT(*) FROM documents");
    const total = parseInt(countResult.rows[0].count, 10);

    // ドキュメント一覧を取得
    const result: QueryResult = await client.query(
      `SELECT id, text, created_at
       FROM documents
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const documents: DocumentSummary[] = result.rows.map((row) => ({
      id: row.id,
      text: row.text,
      preview: row.text.substring(0, 100) + (row.text.length > 100 ? "..." : ""),
      created_at: row.created_at,
    }));

    return { documents, total };
  } finally {
    client.release();
  }
}

// ドキュメントを類似度でクラスタリング
export async function clusterDocuments(similarityThreshold: number = 0.7): Promise<DocumentCluster[]> {
  const client = await pool.connect();
  try {
    await pgvector.registerType(client);

    // 全ドキュメントの埋め込みを取得
    const result: QueryResult = await client.query(
      "SELECT id, text, embedding, created_at FROM documents ORDER BY created_at DESC"
    );

    if (result.rows.length === 0) {
      return [];
    }

    const documents = result.rows;
    const clusters: DocumentCluster[] = [];
    const assigned = new Set<number>();

    // 簡易クラスタリング: 各ドキュメントを順に見て、類似度が高いものをグループ化
    for (const doc of documents) {
      if (assigned.has(doc.id)) continue;

      const cluster: DocumentCluster = {
        clusterId: clusters.length + 1,
        label: doc.text.substring(0, 30) + "...",
        documents: [
          {
            id: doc.id,
            text: doc.text,
            preview: doc.text.substring(0, 100) + (doc.text.length > 100 ? "..." : ""),
            created_at: doc.created_at,
          },
        ],
      };
      assigned.add(doc.id);

      // 他のドキュメントと類似度を計算
      for (const other of documents) {
        if (assigned.has(other.id)) continue;

        // コサイン類似度を計算（pgvectorの<=>はコサイン距離）
        const similarityQuery = await client.query(
          "SELECT 1 - ($1::vector <=> $2::vector) AS similarity",
          [pgvector.toSql(doc.embedding), pgvector.toSql(other.embedding)]
        );
        const similarity = parseFloat(similarityQuery.rows[0].similarity);

        if (similarity >= similarityThreshold) {
          cluster.documents.push({
            id: other.id,
            text: other.text,
            preview: other.text.substring(0, 100) + (other.text.length > 100 ? "..." : ""),
            created_at: other.created_at,
          });
          assigned.add(other.id);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  } finally {
    client.release();
  }
}

// データベース接続を閉じる
export async function closeConnection(): Promise<void> {
  await pool.end();
}

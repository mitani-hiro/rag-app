import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embedding';
import { searchSimilarDocuments } from '@/lib/db';
import { generateAnswer } from '@/lib/llm';
import type { SearchRequest, SearchResponse, SearchResult } from '@/types';

const DATABASE_ENABLED = process.env.DATABASE_ENABLED !== 'false';

// デモ用モックデータ
const MOCK_DOCUMENTS: SearchResult[] = [
  {
    id: 1,
    text: 'これはRAGアプリケーションのデモです。AWS App Runnerでホスティングされています。',
    similarity: 0.95,
  },
  {
    id: 2,
    text: 'AWS Bedrockを使用してLLMによる回答生成と埋め込み生成を行っています。',
    similarity: 0.88,
  },
];

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const { query, topK = 5 } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json<SearchResponse>(
        {
          success: false,
          error: '質問が空です',
        },
        { status: 400 }
      );
    }

    let similarDocs: SearchResult[];

    if (DATABASE_ENABLED) {
      // 質問を埋め込みに変換
      console.log('Generating embedding for query:', query);
      const queryEmbedding = await generateEmbedding(query);

      // 類似文書を検索
      console.log('Searching for similar documents...');
      similarDocs = await searchSimilarDocuments(queryEmbedding, topK);
    } else {
      // DB無効時はモックデータを使用
      console.log('Database disabled - using mock data');
      similarDocs = MOCK_DOCUMENTS.slice(0, topK);
    }

    if (similarDocs.length === 0) {
      return NextResponse.json<SearchResponse>({
        success: true,
        answer: '関連する情報が見つかりませんでした。',
        sources: [],
      });
    }

    // 検索結果をコンテキストとして結合
    const context = similarDocs
      .map((doc, idx) => `[文書${idx + 1}] ${doc.text}`)
      .join('\n\n');

    // LLMで回答を生成
    console.log('Generating answer with LLM...');
    const answer = await generateAnswer(query, context);

    return NextResponse.json<SearchResponse>({
      success: true,
      answer,
      sources: similarDocs,
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json<SearchResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

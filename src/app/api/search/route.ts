import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embedding';
import { searchSimilarDocuments } from '@/lib/db';
import { generateAnswer } from '@/lib/llm';
import type { SearchRequest, SearchResponse } from '@/types';

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

    // 質問を埋め込みに変換
    console.log('Generating embedding for query:', query);
    const queryEmbedding = await generateEmbedding(query);

    // 類似文書を検索
    console.log('Searching for similar documents...');
    const similarDocs = await searchSimilarDocuments(queryEmbedding, topK);

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

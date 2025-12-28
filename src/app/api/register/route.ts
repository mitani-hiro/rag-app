import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embedding';
import { saveDocument } from '@/lib/db';
import type { RegisterRequest, RegisterResponse } from '@/types';

const DATABASE_ENABLED = process.env.DATABASE_ENABLED !== 'false';

export async function POST(request: NextRequest) {
  try {
    // DB無効時は503エラーを返す
    if (!DATABASE_ENABLED) {
      return NextResponse.json<RegisterResponse>(
        {
          success: false,
          error: 'データベースが無効です。デモモードでは文書登録はできません。',
        },
        { status: 503 }
      );
    }

    const body: RegisterRequest = await request.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json<RegisterResponse>(
        {
          success: false,
          error: 'テキストが空です',
        },
        { status: 400 }
      );
    }

    // 埋め込みを生成
    console.log('Generating embedding for text:', text.substring(0, 50) + '...');
    const embedding = await generateEmbedding(text);

    // データベースに保存
    console.log('Saving document to database...');
    const documentId = await saveDocument(text, embedding);

    console.log('Document saved successfully with ID:', documentId);

    return NextResponse.json<RegisterResponse>({
      success: true,
      documentId,
    });
  } catch (error) {
    console.error('Error in register API:', error);
    return NextResponse.json<RegisterResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

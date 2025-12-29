import { NextRequest, NextResponse } from 'next/server';
import { getDocumentSummaries, clusterDocuments } from '@/lib/db';
import type { DocumentsResponse } from '@/types';

const DATABASE_ENABLED = process.env.DATABASE_ENABLED !== 'false';

export async function GET(request: NextRequest) {
  try {
    // DB無効時は503エラーを返す
    if (!DATABASE_ENABLED) {
      return NextResponse.json<DocumentsResponse>(
        {
          success: false,
          error: 'データベースが無効です。デモモードではドキュメント一覧は取得できません。',
        },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') || 'list'; // 'list' or 'cluster'
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');

    if (mode === 'cluster') {
      // クラスタリングモード
      console.log('Clustering documents with threshold:', threshold);
      const clusters = await clusterDocuments(threshold);

      return NextResponse.json<DocumentsResponse>({
        success: true,
        total: clusters.reduce((sum, c) => sum + c.documents.length, 0),
        clusters,
      });
    } else {
      // 一覧モード
      console.log('Fetching document list, limit:', limit, 'offset:', offset);
      const { documents, total } = await getDocumentSummaries(limit, offset);

      return NextResponse.json<DocumentsResponse>({
        success: true,
        total,
        documents,
      });
    }
  } catch (error) {
    console.error('Error in documents API:', error);
    return NextResponse.json<DocumentsResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

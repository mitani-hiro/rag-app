'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { DocumentsResponse, DocumentSummary, DocumentCluster } from '@/types';

type ViewMode = 'list' | 'cluster';

export function DocumentList() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [clusters, setClusters] = useState<DocumentCluster[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async (mode: ViewMode) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ mode });
      if (mode === 'cluster') {
        params.set('threshold', '0.7');
      }

      const response = await fetch(`/api/documents?${params}`);
      const data: DocumentsResponse = await response.json();

      if (data.success) {
        setTotal(data.total || 0);
        if (mode === 'cluster' && data.clusters) {
          setClusters(data.clusters);
          setDocuments([]);
        } else if (data.documents) {
          setDocuments(data.documents);
          setClusters([]);
        }
      } else {
        setError(data.error || 'データの取得に失敗しました');
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(viewMode);
  }, [viewMode]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">登録済みドキュメント</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setViewMode('list')}
            disabled={loading}
            className={viewMode === 'list' ? 'bg-blue-600' : 'bg-gray-400'}
          >
            一覧
          </Button>
          <Button
            onClick={() => setViewMode('cluster')}
            disabled={loading}
            className={viewMode === 'cluster' ? 'bg-blue-600' : 'bg-gray-400'}
          >
            類似グループ
          </Button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500">読み込み中...</div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-100 text-red-800">{error}</div>
      )}

      {!loading && !error && (
        <>
          <p className="text-sm text-gray-600 mb-4">
            全 {total} 件のドキュメント
          </p>

          {viewMode === 'list' && documents.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      ID: {doc.id}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(doc.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{doc.preview}</p>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'cluster' && clusters.length > 0 && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {clusters.map((cluster) => (
                <div
                  key={cluster.clusterId}
                  className="p-4 bg-blue-50 rounded border border-blue-200"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-blue-800">
                      グループ {cluster.clusterId}: {cluster.label}
                    </span>
                    <span className="text-sm text-blue-600">
                      {cluster.documents.length} 件
                    </span>
                  </div>
                  <div className="space-y-2">
                    {cluster.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2 bg-white rounded border border-gray-200"
                      >
                        <p className="text-sm text-gray-700">{doc.preview}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && documents.length === 0 && clusters.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              ドキュメントがありません
            </div>
          )}
        </>
      )}
    </Card>
  );
}

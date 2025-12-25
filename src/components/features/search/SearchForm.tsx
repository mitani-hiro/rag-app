'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import type { SearchResponse, SearchResult } from '@/types';

export function SearchForm() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    answer: string;
    sources: SearchResult[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError('質問を入力してください');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, topK: 5 }),
      });

      const data: SearchResponse = await response.json();

      if (data.success && data.answer && data.sources) {
        setResult({
          answer: data.answer,
          sources: data.sources,
        });
      } else {
        setError(data.error || '検索に失敗しました');
      }
    } catch (error) {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-2xl font-bold mb-4">AI 検索</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="query" className="block text-sm font-medium mb-2">
              質問を入力
            </label>
            <Input
              value={query}
              onChange={setQuery}
              placeholder="質問を入力してください..."
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-100 text-red-800">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '検索中...' : '検索する'}
          </Button>
        </form>
      </Card>

      {result && (
        <>
          <Card>
            <h3 className="text-xl font-bold mb-3">回答</h3>
            <p className="text-gray-800 whitespace-pre-wrap">{result.answer}</p>
          </Card>

          {result.sources.length > 0 && (
            <Card>
              <h3 className="text-xl font-bold mb-3">参考文書</h3>
              <div className="space-y-3">
                {result.sources.map((source, idx) => (
                  <div
                    key={source.id}
                    className="p-3 bg-gray-50 rounded border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        文書 {idx + 1}
                      </span>
                      <span className="text-sm text-gray-500">
                        類似度: {(source.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{source.text}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import type { RegisterResponse } from '@/types';

export function RegisterForm() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      setMessage({ type: 'error', text: 'テキストを入力してください' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const data: RegisterResponse = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `登録に成功しました！（ID: ${data.documentId}）`,
        });
        setText('');
      } else {
        setMessage({
          type: 'error',
          text: data.error || '登録に失敗しました',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: '通信エラーが発生しました',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-4">テキスト登録</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="text" className="block text-sm font-medium mb-2">
            登録するテキスト
          </label>
          <Textarea
            value={text}
            onChange={setText}
            placeholder="ここにテキストを入力してください..."
            rows={8}
            disabled={loading}
          />
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '登録中...' : '登録する'}
        </Button>
      </form>
    </Card>
  );
}

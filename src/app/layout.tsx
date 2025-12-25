import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RAG App - AI検索アプリ',
  description: 'テキストを登録してAIで検索できるアプリケーション',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-800">RAG App</h1>
                <div className="flex gap-4">
                  <Link
                    href="/"
                    className="text-gray-600 hover:text-gray-900 font-medium"
                  >
                    検索
                  </Link>
                  <Link
                    href="/register"
                    className="text-gray-600 hover:text-gray-900 font-medium"
                  >
                    テキスト登録
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

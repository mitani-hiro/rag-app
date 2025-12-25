import { SearchForm } from '@/components/features/search/SearchForm';

export default function HomePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI 検索</h1>
        <p className="text-gray-600">
          登録されたテキストから関連情報を検索してAIが回答します
        </p>
      </div>
      <SearchForm />
    </div>
  );
}

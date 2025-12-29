import { SearchForm } from '@/components/features/search/SearchForm';
import { DocumentList } from '@/components/features/documents/DocumentList';

export default function HomePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI 検索</h1>
        <p className="text-gray-600">
          登録されたテキストから関連情報を検索してAIが回答します
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SearchForm />
        </div>
        <div>
          <DocumentList />
        </div>
      </div>
    </div>
  );
}

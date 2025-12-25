import { RegisterForm } from '@/components/features/register/RegisterForm';

export default function RegisterPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">テキスト登録</h1>
        <p className="text-gray-600">
          検索可能なテキストをデータベースに登録します
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}

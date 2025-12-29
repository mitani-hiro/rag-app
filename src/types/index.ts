export interface Document {
  id: number;
  text: string;
  embedding: number[];
  created_at: Date;
}

export interface SearchResult {
  id: number;
  text: string;
  similarity: number;
}

export interface RegisterRequest {
  text: string;
}

export interface RegisterResponse {
  success: boolean;
  documentId?: number;
  error?: string;
}

export interface SearchRequest {
  query: string;
  topK?: number;
}

export interface SearchResponse {
  success: boolean;
  answer?: string;
  sources?: SearchResult[];
  error?: string;
}

// ドキュメント一覧用の型
export interface DocumentSummary {
  id: number;
  text: string;
  preview: string;
  created_at: Date;
}

export interface DocumentCluster {
  clusterId: number;
  label: string;
  documents: DocumentSummary[];
}

export interface DocumentsResponse {
  success: boolean;
  total?: number;
  documents?: DocumentSummary[];
  clusters?: DocumentCluster[];
  error?: string;
}

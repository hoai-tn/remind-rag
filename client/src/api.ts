export interface Document {
  id: number;
  filename: string;
  uploaded_at: string;
  chunk_count: number;
}

export interface Source {
  id: number;
  document_id: number;
  filename: string;
  content: string;
  chunk_index: number;
  similarity: number;
}

export interface QueryResult {
  answer: string;
  sources: Source[];
}

export async function uploadDocument(file: File): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/documents", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Upload failed");
  }
  return res.json();
}

export async function listDocuments(): Promise<Document[]> {
  const res = await fetch("/api/documents");
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function deleteDocument(id: number): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete document");
}

export async function queryDocuments(question: string): Promise<QueryResult> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Query failed");
  }
  return res.json();
}

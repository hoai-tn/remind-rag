import { useState, useEffect } from "react";
import { listDocuments, type Document } from "./api";
import UploadForm from "./components/UploadForm";
import DocumentList from "./components/DocumentList";
import QueryPanel from "./components/QueryPanel";

export default function App() {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    listDocuments().then(setDocuments).catch(console.error);
  }, []);

  function handleUploaded(doc: Document) {
    setDocuments((prev) => [doc, ...prev]);
  }

  function handleDeleted(id: number) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl p-6">
      <h1 className="mb-8 text-3xl font-bold">Remind RAG</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <UploadForm onUploaded={handleUploaded} />
          <DocumentList documents={documents} onDeleted={handleDeleted} />
        </div>
        <div>
          <QueryPanel />
        </div>
      </div>
    </div>
  );
}

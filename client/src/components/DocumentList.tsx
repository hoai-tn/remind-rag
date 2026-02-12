import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2 } from "lucide-react";
import { type Document, deleteDocument } from "@/api";

interface DocumentListProps {
  documents: Document[];
  onDeleted: (id: number) => void;
}

export default function DocumentList({ documents, onDeleted }: DocumentListProps) {
  async function handleDelete(id: number) {
    try {
      await deleteDocument(id);
      onDeleted(id);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents uploaded yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {doc.filename}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {doc.chunk_count} chunks
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(doc.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

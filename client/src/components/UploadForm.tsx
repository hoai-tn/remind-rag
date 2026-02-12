import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { uploadDocument, type Document } from "@/api";

interface UploadFormProps {
  onUploaded: (doc: Document) => void;
}

export default function UploadForm({ onUploaded }: UploadFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const doc = await uploadDocument(file);
      onUploaded(doc);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
        />
        <Button onClick={handleUpload} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Upload & Process"
          )}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

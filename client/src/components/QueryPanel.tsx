import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { queryDocuments, type Source } from "@/api";
import ChunkViewer from "./ChunkViewer";

export default function QueryPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleQuery() {
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const result = await queryDocuments(question);
      setAnswer(result.answer);
      setSources(result.sources);
    } catch (err: any) {
      setError(err.message);
      setAnswer(null);
      setSources([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Ask a Question
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about your documents..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuery()}
            />
            <Button onClick={handleQuery} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Ask"
              )}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {answer && (
            <div className="rounded-md bg-muted p-4">
              <p className="whitespace-pre-wrap text-sm">{answer}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ChunkViewer sources={sources} />
    </div>
  );
}

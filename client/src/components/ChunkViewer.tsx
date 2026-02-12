import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen } from "lucide-react";
import { type Source } from "@/api";

interface ChunkViewerProps {
  sources: Source[];
}

export default function ChunkViewer({ sources }: ChunkViewerProps) {
  if (sources.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Sources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3 pr-4">
            {sources.map((source, i) => (
              <Card key={source.id} className="bg-muted/50">
                <CardContent className="p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline">{source.filename}</Badge>
                    <Badge variant="secondary">
                      {(source.similarity * 100).toFixed(1)}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Source {i + 1}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{source.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

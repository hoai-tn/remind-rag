import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

export async function chunkText(text: string): Promise<string[]> {
  if (!text.trim()) return [];
  const docs = await splitter.createDocuments([text]);
  return docs.map((doc) => doc.pageContent);
}

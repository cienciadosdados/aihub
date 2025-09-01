import OpenAI from "openai";
import { parse } from "node-html-parser";
import { SemanticChunker } from "./semantic-chunker";
import { EnhancedVectorStore } from "./vector-store";

export interface DocumentChunk {
  content: string;
  metadata: Record<string, any>;
  chunk_index: number;
}

export class RAGProcessor {
  private openai: OpenAI;
  private semanticChunker: SemanticChunker;
  private vectorStore?: EnhancedVectorStore;

  constructor(apiKey: string, database?: any) {
    this.openai = new OpenAI({ apiKey });
    this.semanticChunker = new SemanticChunker(apiKey);
    if (database) {
      this.vectorStore = new EnhancedVectorStore(apiKey, database);
    }
  }

  // Advanced text chunking with multiple strategies
  async chunkText(
    text: string, 
    chunkSize: number = 1000, 
    overlap: number = 200, 
    strategy: 'paragraph' | 'sentence' | 'recursive' | 'semantic' = 'recursive'
  ): Promise<DocumentChunk[]> {
    try {
      const semanticChunks = await this.semanticChunker.chunkTextSemantically(
        text, 
        chunkSize, 
        overlap, 
        strategy
      );
      
      // Convert SemanticChunk to DocumentChunk format
      return semanticChunks.map(chunk => ({
        content: chunk.content,
        metadata: chunk.metadata,
        chunk_index: chunk.chunk_index
      }));
    } catch (error) {
      console.error('Semantic chunking failed, falling back to simple chunking:', error);
      return this.chunkTextSimple(text, chunkSize, overlap);
    }
  }

  // Fallback simple chunking method
  private chunkTextSimple(text: string, chunkSize: number = 1000, overlap: number = 200): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let index = 0;
    let chunkIndex = 0;

    while (index < text.length) {
      const end = Math.min(index + chunkSize, text.length);
      const chunk = text.slice(index, end);
      
      chunks.push({
        content: chunk.trim(),
        metadata: { 
          start_index: index, 
          end_index: end,
          length: chunk.length,
          chunk_type: 'simple'
        },
        chunk_index: chunkIndex++
      });

      // Move forward by chunkSize minus overlap
      index += chunkSize - overlap;
      
      // Prevent infinite loop
      if (index >= text.length) break;
    }

    return chunks.filter(chunk => chunk.content.length > 0);
  }

  // Generate embeddings for text
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      throw error;
    }
  }

  // Process URL content
  async processUrl(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const root = parse(html);
      
      // Remove script and style tags
      root.querySelectorAll('script, style, nav, header, footer').forEach(el => el.remove());
      
      // Extract text content
      const textContent = root.querySelector('body')?.innerText || root.innerText || '';
      
      return this.cleanText(textContent);
    } catch (error) {
      console.error("Failed to process URL:", error);
      throw error;
    }
  }

  // Process YouTube video transcript
  async processYouTube(url: string): Promise<string> {
    try {
      // Extract video ID from URL
      const videoId = this.extractYouTubeId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      // Get transcript using youtube-transcript
      const ytTranscript = await import('youtube-transcript');
      const transcript = await ytTranscript.YoutubeTranscript.fetchTranscript(videoId);
      
      // Combine transcript entries
      const text = transcript.map((entry: any) => entry.text).join(' ');
      
      return this.cleanText(text);
    } catch (error) {
      console.error("Failed to process YouTube:", error);
      throw error;
    }
  }

  // Process PDF content
  async processPdf(buffer: ArrayBuffer): Promise<string> {
    try {
      const pdf = await import('pdf-parse');
      const data = await (pdf as any).default(Buffer.from(buffer));
      return this.cleanText(data.text);
    } catch (error) {
      console.error("Failed to process PDF:", error);
      throw error;
    }
  }

  // Process Word document
  async processWord(buffer: ArrayBuffer): Promise<string> {
    try {
      const mammoth = await import('mammoth');
      const result = await (mammoth as any).extractRawText({ buffer: Buffer.from(buffer) });
      return this.cleanText(result.value);
    } catch (error) {
      console.error("Failed to process Word document:", error);
      throw error;
    }
  }

  // Process PowerPoint document
  async processPowerPoint(buffer: ArrayBuffer): Promise<string> {
    try {
      // For now, we'll extract text from PowerPoint using a simple approach
      // In a production environment, you might want to use a library like node-pptx
      const text = Buffer.from(buffer).toString('utf8');
      return this.cleanText(text);
    } catch (error) {
      console.error("Failed to process PowerPoint:", error);
      throw error;
    }
  }

  // Clean and normalize text
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim();
  }

  // Extract YouTube video ID from URL
  private extractYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  // Calculate cosine similarity between two vectors
  calculateSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // Enhanced chunk search using vector store
  async findRelevantChunks(
    query: string,
    _agentId: number,
    _maxChunks: number = 3,
    _threshold: number = 0.7,
    searchStrategy: 'cosine' | 'euclidean' | 'hybrid' = 'hybrid',
    enableContextual: boolean = true
  ): Promise<Array<{ content: string; similarity: number; metadata?: any }>> {
    if (!this.vectorStore) {
      // Fallback to simple embedding search
      return this.findRelevantChunksSimple(query, _agentId, _maxChunks, _threshold);
    }

    try {
      if (enableContextual) {
        const results = await this.vectorStore.contextualSearch(query, _agentId, _maxChunks);
        return results.map(r => ({
          content: r.content,
          similarity: r.similarity,
          metadata: r.metadata
        }));
      } else {
        const results = await this.vectorStore.searchSimilar(
          query, 
          _agentId, 
          _maxChunks, 
          _threshold, 
          searchStrategy
        );
        return results.map(r => ({
          content: r.content,
          similarity: r.similarity,
          metadata: r.metadata
        }));
      }
    } catch (error) {
      console.error('Enhanced search failed, falling back to simple search:', error);
      return this.findRelevantChunksSimple(query, _agentId, _maxChunks, _threshold);
    }
  }

  // Fallback simple similarity search - deprecated
  private async findRelevantChunksSimple(
    _query: string,
    _agentId: number,
    _maxChunks: number = 3,
    _threshold: number = 0.7
  ): Promise<Array<{ content: string; similarity: number }>> {
    // Deprecated - all searches now use Pinecone
    return [];
  }

  // Get vector store statistics
  async getKnowledgeStatistics(agentId: number): Promise<any> {
    if (!this.vectorStore) return null;
    return this.vectorStore.getStatistics(agentId);
  }
}

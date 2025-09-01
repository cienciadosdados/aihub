import OpenAI from "openai";

export interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

// Enhanced vector store with better similarity search and indexing
export class EnhancedVectorStore {
  private openai: OpenAI;
  private db: any;

  constructor(openaiApiKey: string, database: any) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.db = database;
  }

  // Add document with enhanced metadata
  async addDocument(
    knowledgeSourceId: number,
    content: string,
    metadata: Record<string, any> = {},
    chunkIndex: number = 0
  ): Promise<string> {
    // Generate embedding
    const embedding = await this.generateEmbedding(content);
    const embeddingBlob = new Uint8Array(new Float32Array(embedding).buffer);

    // Enhanced metadata with searchable fields
    const enhancedMetadata = {
      ...metadata,
      content_length: content.length,
      word_count: content.split(/\s+/).length,
      has_numbers: /\d/.test(content),
      has_urls: /https?:\/\//.test(content),
      language: this.detectLanguage(content),
      content_type: this.classifyContent(content),
      created_at: new Date().toISOString(),
      ...this.extractKeywords(content)
    };

    // Store in database with enhanced schema
    const { meta } = await this.db.prepare(`
      INSERT INTO document_chunks (
        knowledge_source_id, 
        content, 
        embedding, 
        chunk_index, 
        metadata,
        content_hash,
        content_preview
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      knowledgeSourceId,
      content,
      embeddingBlob,
      chunkIndex,
      JSON.stringify(enhancedMetadata),
      this.generateContentHash(content),
      content.slice(0, 200) + (content.length > 200 ? '...' : '')
    ).run();

    return meta.last_row_id!.toString();
  }

  // Enhanced similarity search with multiple ranking strategies
  async searchSimilar(
    query: string,
    agentId: number,
    limit: number = 5,
    threshold: number = 0.7,
    searchStrategy: 'cosine' | 'euclidean' | 'hybrid' = 'hybrid',
    filters: Record<string, any> = {}
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Get all eligible chunks with filtering
    let sqlQuery = `
      SELECT 
        dc.id,
        dc.content, 
        dc.embedding, 
        dc.metadata,
        dc.content_preview,
        ks.name as source_name,
        ks.type as source_type
      FROM document_chunks dc
      JOIN knowledge_sources ks ON dc.knowledge_source_id = ks.id
      WHERE ks.agent_id = ? AND ks.status = 'completed'
    `;
    
    const params = [agentId];

    // Apply filters
    if (filters.source_type) {
      sqlQuery += ` AND ks.type = ?`;
      params.push(filters.source_type);
    }
    
    if (filters.min_length) {
      sqlQuery += ` AND JSON_EXTRACT(dc.metadata, '$.content_length') >= ?`;
      params.push(filters.min_length);
    }

    if (filters.content_type) {
      sqlQuery += ` AND JSON_EXTRACT(dc.metadata, '$.content_type') = ?`;
      params.push(filters.content_type);
    }

    sqlQuery += ` ORDER BY dc.created_at DESC`;

    const { results } = await this.db.prepare(sqlQuery).bind(...params).all();

    if (!results.length) return [];

    // Calculate similarities with different strategies
    const similarities = results.map((chunk: any) => {
      const embedding = Array.from(new Float32Array(chunk.embedding.buffer));
      
      let similarity: number;
      switch (searchStrategy) {
        case 'euclidean':
          similarity = this.calculateEuclideanSimilarity(queryEmbedding, embedding);
          break;
        case 'cosine':
          similarity = this.calculateCosineSimilarity(queryEmbedding, embedding);
          break;
        case 'hybrid':
          const cosine = this.calculateCosineSimilarity(queryEmbedding, embedding);
          const euclidean = this.calculateEuclideanSimilarity(queryEmbedding, embedding);
          const keywordScore = this.calculateKeywordSimilarity(query, chunk.content);
          // Weighted combination
          similarity = cosine * 0.6 + euclidean * 0.3 + keywordScore * 0.1;
          break;
        default:
          similarity = this.calculateCosineSimilarity(queryEmbedding, embedding);
      }

      return {
        id: chunk.id.toString(),
        content: chunk.content,
        similarity,
        metadata: {
          ...JSON.parse(chunk.metadata || '{}'),
          source_name: chunk.source_name,
          source_type: chunk.source_type,
          content_preview: chunk.content_preview
        }
      };
    });

    // Apply threshold and sort
    return similarities
      .filter((item: any) => item.similarity >= threshold)
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Hybrid search combining vector similarity with keyword matching
  async hybridSearch(
    query: string,
    agentId: number,
    limit: number = 5,
    vectorWeight: number = 0.7,
    keywordWeight: number = 0.3
  ): Promise<VectorSearchResult[]> {
    // Vector search
    const vectorResults = await this.searchSimilar(query, agentId, limit * 2, 0.5, 'cosine');
    
    // Keyword search using SQLite FTS (if available) or simple text matching
    const keywords = this.extractSearchKeywords(query);
    const keywordResults = await this.keywordSearch(keywords, agentId, limit * 2);

    // Combine and re-rank results
    const combinedResults = new Map<string, VectorSearchResult>();

    // Add vector results with weighted scores
    vectorResults.forEach(result => {
      combinedResults.set(result.id, {
        ...result,
        similarity: result.similarity * vectorWeight
      });
    });

    // Add or boost keyword results
    keywordResults.forEach(result => {
      const existing = combinedResults.get(result.id);
      if (existing) {
        existing.similarity += result.similarity * keywordWeight;
      } else {
        combinedResults.set(result.id, {
          ...result,
          similarity: result.similarity * keywordWeight
        });
      }
    });

    return Array.from(combinedResults.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Contextual search that considers document structure
  async contextualSearch(
    query: string,
    agentId: number,
    limit: number = 5,
    contextWindow: number = 2
  ): Promise<VectorSearchResult[]> {
    const results = await this.searchSimilar(query, agentId, limit);
    
    // For each result, get surrounding chunks for better context
    const enhancedResults = await Promise.all(
      results.map(async (result) => {
        const { results: contextChunks } = await this.db.prepare(`
          SELECT content, chunk_index
          FROM document_chunks dc
          JOIN knowledge_sources ks ON dc.knowledge_source_id = ks.id
          WHERE ks.agent_id = ? 
            AND dc.knowledge_source_id = (
              SELECT knowledge_source_id 
              FROM document_chunks 
              WHERE id = ?
            )
            AND dc.chunk_index BETWEEN ? AND ?
          ORDER BY dc.chunk_index
        `).bind(
          agentId,
          result.id,
          Math.max(0, (result.metadata.chunk_index || 0) - contextWindow),
          (result.metadata.chunk_index || 0) + contextWindow
        ).all();

        const contextContent = contextChunks
          .map((chunk: any) => chunk.content)
          .join('\n\n');

        return {
          ...result,
          content: contextContent || result.content,
          metadata: {
            ...result.metadata,
            has_context: contextChunks.length > 1,
            context_chunks: contextChunks.length
          }
        };
      })
    );

    return enhancedResults;
  }

  // Generate statistics about the vector store
  async getStatistics(agentId: number): Promise<{
    total_chunks: number;
    total_sources: number;
    avg_chunk_size: number;
    content_types: Record<string, number>;
    source_types: Record<string, number>;
  }> {
    const stats = await this.db.prepare(`
      SELECT 
        COUNT(dc.id) as total_chunks,
        COUNT(DISTINCT ks.id) as total_sources,
        AVG(JSON_EXTRACT(dc.metadata, '$.content_length')) as avg_chunk_size,
        GROUP_CONCAT(DISTINCT ks.type) as source_types,
        GROUP_CONCAT(DISTINCT JSON_EXTRACT(dc.metadata, '$.content_type')) as content_types
      FROM document_chunks dc
      JOIN knowledge_sources ks ON dc.knowledge_source_id = ks.id
      WHERE ks.agent_id = ? AND ks.status = 'completed'
    `).bind(agentId).first() as any;

    return {
      total_chunks: stats?.total_chunks || 0,
      total_sources: stats?.total_sources || 0,
      avg_chunk_size: Math.round(stats?.avg_chunk_size || 0),
      source_types: this.parseGroupConcat(stats?.source_types),
      content_types: this.parseGroupConcat(stats?.content_types)
    };
  }

  // Private helper methods
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

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

  private calculateEuclideanSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let sumSquaredDiff = 0;
    for (let i = 0; i < vec1.length; i++) {
      sumSquaredDiff += Math.pow(vec1[i] - vec2[i], 2);
    }
    
    const distance = Math.sqrt(sumSquaredDiff);
    // Convert distance to similarity (0-1 scale)
    return 1 / (1 + distance);
  }

  private calculateKeywordSimilarity(query: string, content: string): number {
    const queryKeywords = this.extractSearchKeywords(query);
    const contentLower = content.toLowerCase();
    
    let matches = 0;
    for (const keyword of queryKeywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    
    return queryKeywords.length > 0 ? matches / queryKeywords.length : 0;
  }

  private async keywordSearch(keywords: string[], agentId: number, limit: number): Promise<VectorSearchResult[]> {
    if (!keywords.length) return [];

    const whereClause = keywords.map(() => 'dc.content LIKE ?').join(' OR ');
    const params = [agentId, ...keywords.map(k => `%${k}%`)];

    const { results } = await this.db.prepare(`
      SELECT 
        dc.id,
        dc.content,
        dc.metadata,
        dc.content_preview
      FROM document_chunks dc
      JOIN knowledge_sources ks ON dc.knowledge_source_id = ks.id
      WHERE ks.agent_id = ? AND ks.status = 'completed' AND (${whereClause})
      ORDER BY LENGTH(dc.content) DESC
      LIMIT ?
    `).bind(...params, limit).all();

    return results.map((chunk: any) => ({
      id: chunk.id.toString(),
      content: chunk.content,
      similarity: this.calculateKeywordSimilarity(keywords.join(' '), chunk.content),
      metadata: JSON.parse(chunk.metadata || '{}')
    }));
  }

  private extractSearchKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 10); // Limit to avoid too many keywords
  }

  private detectLanguage(text: string): string {
    // Simple language detection - could be enhanced with a proper library
    const commonPortugueseWords = ['que', 'não', 'uma', 'para', 'com', 'como', 'mas', 'por', 'ser', 'isso'];
    const commonEnglishWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had'];
    
    const words = text.toLowerCase().split(/\s+/).slice(0, 50);
    const ptMatches = words.filter(word => commonPortugueseWords.includes(word)).length;
    const enMatches = words.filter(word => commonEnglishWords.includes(word)).length;
    
    if (ptMatches > enMatches) return 'pt';
    if (enMatches > ptMatches) return 'en';
    return 'unknown';
  }

  private classifyContent(text: string): string {
    if (text.match(/^\s*#|^\s*\d+\./m)) return 'structured';
    if (text.match(/https?:\/\/|www\./)) return 'web_content';
    if (text.match(/\b(function|class|import|export)\b/)) return 'code';
    if (text.match(/\b(Abstract|Introduction|Conclusion|References)\b/i)) return 'academic';
    if (text.length < 100) return 'short';
    return 'general';
  }

  private extractKeywords(text: string): Record<string, any> {
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};
    
    words.forEach(word => {
      const cleaned = word.replace(/[^\w]/g, '');
      if (cleaned.length > 3) {
        wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
      }
    });

    const sortedWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return {
      top_keywords: sortedWords.map(([word]) => word),
      keyword_density: sortedWords.map(([word, freq]) => ({ word, freq }))
    };
  }

  private generateContentHash(content: string): string {
    // Simple hash function - could use crypto API in production
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private parseGroupConcat(value: string | null): Record<string, number> {
    if (!value) return {};
    
    const items = value.split(',');
    const counts: Record<string, number> = {};
    
    items.forEach(item => {
      const trimmed = item.trim();
      if (trimmed && trimmed !== 'null') {
        counts[trimmed] = (counts[trimmed] || 0) + 1;
      }
    });
    
    return counts;
  }
}

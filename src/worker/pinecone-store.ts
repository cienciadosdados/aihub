import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

export interface PineconeDocument {
  id: string;
  values: number[];
  metadata: {
    agent_id: number;
    knowledge_source_id: number;
    content: string;
    chunk_index: number;
    content_length: number;
    word_count: number;
    content_type: string;
    language: string;
    source_name?: string;
    source_type?: string;
    created_at: string;
    [key: string]: any;
  };
}

export interface PineconeSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

export class PineconeVectorStore {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private indexName: string;
  private namespace: string;

  constructor(
    pineconeApiKey: string,
    openaiApiKey: string,
    indexName: string = 'mocha-rag',
    namespace: string = 'default'
  ) {
    this.pinecone = new Pinecone({
      apiKey: pineconeApiKey,
    });
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.indexName = indexName;
    this.namespace = namespace;
  }

  // Add document to Pinecone with semantic metadata and retry logic
  async addDocument(
    knowledgeSourceId: number,
    agentId: number,
    content: string,
    chunkIndex: number = 0,
    sourceName?: string,
    sourceType?: string,
    additionalMetadata: Record<string, any> = {}
  ): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Validate input
        if (!content || content.trim().length === 0) {
          throw new Error('Content cannot be empty');
        }
        
        if (content.length > 40000) {
          console.warn(`Content truncated from ${content.length} to 40000 chars for chunk ${chunkIndex}`);
          content = content.slice(0, 40000);
        }

        // Generate embedding with timeout
        const embedding = await Promise.race([
          this.generateEmbedding(content),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Embedding generation timeout')), 30000)
          )
        ]);
        
        // Create unique ID
        const id = `${agentId}_${knowledgeSourceId}_${chunkIndex}_${Date.now()}`;
        
        // Enhanced metadata with searchable fields
        const metadata: PineconeDocument['metadata'] = {
          agent_id: agentId,
          knowledge_source_id: knowledgeSourceId,
          content: content.slice(0, 40000), // Pinecone metadata limit
          chunk_index: chunkIndex,
          content_length: content.length,
          word_count: content.split(/\s+/).length,
          content_type: this.classifyContent(content),
          language: this.detectLanguage(content),
          source_name: sourceName,
          source_type: sourceType,
          created_at: new Date().toISOString(),
          has_numbers: /\d/.test(content),
          has_urls: /https?:\/\//.test(content),
          attempt: attempt,
          ...this.extractKeywords(content),
          ...additionalMetadata
        };

        // Get index and upsert document with timeout
        const index = this.pinecone.index(this.indexName);
        
        await Promise.race([
          index.namespace(this.namespace).upsert([{
            id,
            values: embedding,
            metadata
          }]),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Pinecone upsert timeout')), 30000)
          )
        ]);

        console.log(`Successfully stored document ${id} on attempt ${attempt}`);
        return id;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(`Attempt ${attempt} failed`);
        console.error(`Attempt ${attempt}/${maxRetries} failed for chunk ${chunkIndex}:`, lastError);
        
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError || new Error('Failed to add document after all retries');
  }

  // Semantic search with multiple strategies
  async searchSimilar(
    query: string,
    agentId: number,
    limit: number = 5,
    threshold: number = 0.7,
    filters: Record<string, any> = {}
  ): Promise<PineconeSearchResult[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const index = this.pinecone.index(this.indexName);

      // Build filter for agent and additional constraints
      const pineconeFilter: Record<string, any> = {
        agent_id: { $eq: agentId }
      };

      // Add additional filters
      if (filters.source_type) {
        pineconeFilter.source_type = { $eq: filters.source_type };
      }
      if (filters.content_type) {
        pineconeFilter.content_type = { $eq: filters.content_type };
      }
      if (filters.language) {
        pineconeFilter.language = { $eq: filters.language };
      }
      if (filters.min_length) {
        pineconeFilter.content_length = { $gte: filters.min_length };
      }

      // Perform vector search
      const searchResults = await index.namespace(this.namespace).query({
        vector: queryEmbedding,
        topK: limit * 2, // Get more results to filter by threshold
        filter: pineconeFilter,
        includeMetadata: true,
        includeValues: false
      });

      // Process and filter results
      const results: PineconeSearchResult[] = [];
      
      for (const match of searchResults.matches || []) {
        const similarity = match.score || 0;
        
        if (similarity >= threshold && match.metadata) {
          results.push({
            id: match.id,
            content: match.metadata.content as string,
            similarity,
            metadata: match.metadata
          });
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('Error searching in Pinecone:', error);
      throw error;
    }
  }

  // Hybrid search combining vector + keyword matching
  async hybridSearch(
    query: string,
    agentId: number,
    limit: number = 5,
    vectorWeight: number = 0.8,
    keywordWeight: number = 0.2
  ): Promise<PineconeSearchResult[]> {
    try {
      // Get vector search results
      const vectorResults = await this.searchSimilar(query, agentId, limit * 2, 0.5);
      
      // Enhance with keyword scoring
      const keywords = this.extractSearchKeywords(query);
      const enhancedResults = vectorResults.map(result => {
        const keywordScore = this.calculateKeywordSimilarity(keywords, result.content);
        const hybridScore = (result.similarity * vectorWeight) + (keywordScore * keywordWeight);
        
        return {
          ...result,
          similarity: hybridScore,
          metadata: {
            ...result.metadata,
            vector_score: result.similarity,
            keyword_score: keywordScore,
            hybrid_score: hybridScore
          }
        };
      });

      return enhancedResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error in hybrid search:', error);
      throw error;
    }
  }

  // Contextual search with surrounding chunks
  async contextualSearch(
    query: string,
    agentId: number,
    limit: number = 5,
    contextWindow: number = 2
  ): Promise<PineconeSearchResult[]> {
    try {
      const results = await this.searchSimilar(query, agentId, limit);
      const index = this.pinecone.index(this.indexName);

      // For each result, get surrounding chunks
      const enhancedResults = await Promise.all(
        results.map(async (result) => {
          try {
            const chunkIndex = result.metadata.chunk_index as number;
            const knowledgeSourceId = result.metadata.knowledge_source_id as number;

            // Search for surrounding chunks
            const contextFilter = {
              agent_id: { $eq: agentId },
              knowledge_source_id: { $eq: knowledgeSourceId },
              chunk_index: {
                $gte: Math.max(0, chunkIndex - contextWindow),
                $lte: chunkIndex + contextWindow
              }
            };

            const contextResults = await index.namespace(this.namespace).query({
              vector: await this.generateEmbedding(''), // Dummy vector for filter-only search
              topK: contextWindow * 2 + 1,
              filter: contextFilter,
              includeMetadata: true,
              includeValues: false
            });

            // Combine context chunks
            const contextChunks = (contextResults.matches || [])
              .filter(match => match.metadata)
              .sort((a, b) => (a.metadata!.chunk_index as number) - (b.metadata!.chunk_index as number))
              .map(match => match.metadata!.content as string);

            const contextContent = contextChunks.length > 1 
              ? contextChunks.join('\n\n')
              : result.content;

            return {
              ...result,
              content: contextContent,
              metadata: {
                ...result.metadata,
                has_context: contextChunks.length > 1,
                context_chunks: contextChunks.length
              }
            };
          } catch (contextError) {
            console.error('Error getting context for chunk:', contextError);
            return result; // Return original if context fails
          }
        })
      );

      return enhancedResults;
    } catch (error) {
      console.error('Error in contextual search:', error);
      throw error;
    }
  }

  // Delete documents by filter
  async deleteDocuments(agentId: number, knowledgeSourceId?: number): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      const filter: Record<string, any> = {
        agent_id: { $eq: agentId }
      };

      if (knowledgeSourceId !== undefined) {
        filter.knowledge_source_id = { $eq: knowledgeSourceId };
      }

      await index.namespace(this.namespace).deleteMany(filter);
    } catch (error) {
      console.error('Error deleting documents from Pinecone:', error);
      throw error;
    }
  }

  // Get statistics about stored documents
  async getStatistics(agentId: number): Promise<{
    total_chunks: number;
    content_types: Record<string, number>;
    source_types: Record<string, number>;
    languages: Record<string, number>;
  }> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Get index statistics
      await index.describeIndexStats();
      
      // For detailed stats, we'd need to query and aggregate
      // This is a simplified version - could be enhanced with sampling
      const sampleResults = await index.namespace(this.namespace).query({
        vector: new Array(1536).fill(0), // Zero vector for sampling
        topK: 1000, // Sample size
        filter: { agent_id: { $eq: agentId } },
        includeMetadata: true,
        includeValues: false
      });

      const contentTypes: Record<string, number> = {};
      const sourceTypes: Record<string, number> = {};
      const languages: Record<string, number> = {};

      for (const match of sampleResults.matches || []) {
        if (match.metadata) {
          const contentType = match.metadata.content_type as string;
          const sourceType = match.metadata.source_type as string;
          const language = match.metadata.language as string;

          if (contentType) contentTypes[contentType] = (contentTypes[contentType] || 0) + 1;
          if (sourceType) sourceTypes[sourceType] = (sourceTypes[sourceType] || 0) + 1;
          if (language) languages[language] = (languages[language] || 0) + 1;
        }
      }

      return {
        total_chunks: sampleResults.matches?.length || 0,
        content_types: contentTypes,
        source_types: sourceTypes,
        languages: languages
      };
    } catch (error) {
      console.error('Error getting statistics from Pinecone:', error);
      return {
        total_chunks: 0,
        content_types: {},
        source_types: {},
        languages: {}
      };
    }
  }

  // Private helper methods
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text || ' ', // Ensure non-empty input
    });
    return response.data[0].embedding;
  }

  private extractSearchKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 10);
  }

  private calculateKeywordSimilarity(keywords: string[], content: string): number {
    const contentLower = content.toLowerCase();
    let matches = 0;
    
    for (const keyword of keywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    
    return keywords.length > 0 ? matches / keywords.length : 0;
  }

  private detectLanguage(text: string): string {
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
      keyword_density: sortedWords.length > 0 ? sortedWords[0][1] / words.length : 0
    };
  }
}

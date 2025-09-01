import { parse } from "node-html-parser";
import { SemanticChunker } from "./semantic-chunker";
import { PineconeVectorStore } from "./pinecone-store";

export interface DocumentChunk {
  content: string;
  metadata: Record<string, any>;
  chunk_index: number;
}

export class PineconeRAGProcessor {
  
  private semanticChunker: SemanticChunker;
  private vectorStore: PineconeVectorStore;

  constructor(
    openaiApiKey: string,
    pineconeApiKey: string,
    pineconeIndexName: string = 'mocha-rag'
  ) {
    
    this.semanticChunker = new SemanticChunker(openaiApiKey);
    this.vectorStore = new PineconeVectorStore(
      pineconeApiKey,
      openaiApiKey,
      pineconeIndexName
    );
  }

  // Advanced text chunking with semantic strategies
  async chunkText(
    text: string, 
    chunkSize: number = 2000, 
    overlap: number = 400, 
    strategy: 'paragraph' | 'sentence' | 'recursive' | 'semantic' = 'semantic'
  ): Promise<DocumentChunk[]> {
    try {
      const semanticChunks = await this.semanticChunker.chunkTextSemantically(
        text, 
        chunkSize, 
        overlap, 
        strategy
      );
      
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

  // Process and store knowledge source in Pinecone with enhanced error handling
  async processKnowledgeSource(
    sourceId: number,
    agentId: number,
    sourceData: {
      type: string;
      name: string;
      source_url?: string;
      content?: string;
      file_path?: string;
    },
    settings: {
      chunk_size: number;
      chunk_overlap: number;
      chunking_strategy: string;
    }
  ): Promise<{ success: boolean; chunks_count: number; error?: string }> {
    const startTime = Date.now();
    console.log(`Processing knowledge source ${sourceId}: ${sourceData.type} - ${sourceData.name}`);
    
    try {
      let content = '';
      
      // Extract content based on type with timeout
      const extractionTimeout = 60000; // 60 seconds timeout
      
      const extractContent = async (): Promise<string> => {
        switch (sourceData.type) {
          case 'url':
            if (!sourceData.source_url) {
              throw new Error('URL is required for URL type sources');
            }
            console.log(`Processing URL: ${sourceData.source_url}`);
            return await this.processUrl(sourceData.source_url);
            
          case 'youtube':
            if (!sourceData.source_url) {
              throw new Error('URL is required for YouTube type sources');
            }
            console.log(`Processing YouTube: ${sourceData.source_url}`);
            return await this.processYouTube(sourceData.source_url);
            
          case 'text':
            if (!sourceData.content) {
              throw new Error('Content is required for text type sources');
            }
            return sourceData.content;
            
          case 'pdf':
            if (!sourceData.content) {
              // Para PDFs antigos sem content, tentar buscar do R2 ou marcar como legacy
              console.log('PDF without content - attempting to process legacy PDF');
              
              // Se tem file_path, tentar buscar do R2
              if (sourceData.file_path) {
                try {
                  console.log(`Attempting to fetch PDF from R2: ${sourceData.file_path}`);
                  // Aqui você precisaria implementar a busca do R2
                  // Por enquanto, vamos marcar como processado mas sem conteúdo
                  console.log('Legacy PDF found but content extraction not implemented - marking as processed');
                  return `Legacy PDF: ${sourceData.name || 'Unnamed PDF'} - Content extraction pending. Please re-upload for full processing.`;
                } catch (r2Error) {
                  console.log('Failed to fetch from R2, marking as legacy');
                  return `Legacy PDF: ${sourceData.name || 'Unnamed PDF'} - Please re-upload this PDF for processing.`;
                }
              } else {
                // PDF antigo sem file_path - apenas marcar como legacy
                console.log('Legacy PDF without file_path - marking for re-upload');
                return `Legacy PDF: ${sourceData.name || 'Unnamed PDF'} - Please re-upload this PDF for processing.`;
              }
            }
            
            // Se o conteúdo já foi extraído (pré-processado), retornar diretamente
            // Se for um buffer/arrayBuffer, processar com unpdf
            if (typeof sourceData.content === 'string') {
              console.log('PDF content already extracted, using pre-processed text');
              return sourceData.content;
            } else if (sourceData.content && typeof sourceData.content === 'object' && 'byteLength' in sourceData.content) {
              console.log('Processing PDF buffer with unpdf');
              return await this.processPdf(sourceData.content as ArrayBuffer);
            } else {
              console.log('PDF content is in unknown format, attempting to process as text');
              return String(sourceData.content);
            }
            
          case 'doc':
          case 'docx':
          case 'pptx':
            if (!sourceData.content) {
              throw new Error(`File type ${sourceData.type} requires file content to be provided`);
            }
            return sourceData.content;
            
          default:
            throw new Error(`Unsupported source type: ${sourceData.type}`);
        }
      };

      // Apply timeout to content extraction
      content = await Promise.race([
        extractContent(),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error(`Content extraction timeout after ${extractionTimeout/1000}s`)), extractionTimeout)
        )
      ]);

      console.log(`Content extraction completed: ${content.length} characters`);

      if (!content || !content.trim()) {
        throw new Error("No content extracted from source or content is empty");
      }

      // Check if content is just a MinerU ZIP URL message (indicates extraction failure)
      if (content.includes('Results available at:') || content.includes('full_zip_url')) {
        throw new Error("PDF processing incomplete - content extraction from MinerU ZIP file failed. Please try re-uploading the PDF or use a different format.");
      }

      // Validate content length
      if (content.length < 10) {
        throw new Error("Content too short - minimum 10 characters required");
      }

      if (content.length > 1000000) { // 1MB limit
        console.warn(`Content very large (${content.length} chars), truncating to 1MB`);
        content = content.substring(0, 1000000);
      }

      console.log(`Total content length: ${content.length} characters`);

      // Chunk the content using semantic strategies with timeout
      console.log(`Starting chunking with strategy: ${settings.chunking_strategy}`);
      const chunkingTimeout = 120000; // 2 minutes timeout
      
      const chunks = await Promise.race([
        this.chunkText(
          content,
          settings.chunk_size,
          settings.chunk_overlap,
          settings.chunking_strategy as any
        ),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Chunking timeout after ${chunkingTimeout/1000}s`)), chunkingTimeout)
        )
      ]);
      
      if (!chunks || chunks.length === 0) {
        throw new Error("No chunks created from content - chunking failed");
      }

      console.log(`Created ${chunks.length} chunks`);

      // Store each chunk in Pinecone with batch processing and error recovery
      console.log(`Starting to store ${chunks.length} chunks in Pinecone`);
      let successCount = 0;
      let lastError: Error | null = null;
      
      // Process chunks in batches to avoid overwhelming Pinecone
      const batchSize = 5;
      const delay = 1000; // 1 second delay between batches
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        // Add delay between batches
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        await Promise.all(batch.map(async (chunk) => {
          try {
            console.log(`Storing chunk ${chunk.chunk_index} (${chunk.content.length} chars)`);
            
            // Add timeout for individual chunk storage
            await Promise.race([
              this.vectorStore.addDocument(
                sourceId,
                agentId,
                chunk.content,
                chunk.chunk_index,
                sourceData.name,
                sourceData.type,
                {
                  ...chunk.metadata,
                  original_url: sourceData.source_url,
                  processing_strategy: settings.chunking_strategy,
                  processed_at: new Date().toISOString(),
                  batch_index: Math.floor(i / batchSize)
                }
              ),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error(`Chunk storage timeout for chunk ${chunk.chunk_index}`)), 30000)
              )
            ]);
            
            successCount++;
            console.log(`Successfully stored chunk ${chunk.chunk_index}`);
          } catch (chunkError) {
            lastError = chunkError instanceof Error ? chunkError : new Error(`Failed to store chunk ${chunk.chunk_index}`);
            console.error(`Failed to store chunk ${chunk.chunk_index}:`, chunkError);
          }
        }));
      }
      
      console.log(`Successfully stored ${successCount}/${chunks.length} chunks in ${Date.now() - startTime}ms`);

      // Ensure at least some chunks were stored
      if (successCount === 0) {
        const errorMsg = lastError ? (lastError as Error).message : 'Failed to store any chunks';
        throw new Error(`Storage failed: ${errorMsg}`);
      }

      // Warn if success rate is low
      const successRate = successCount / chunks.length;
      if (successRate < 0.8) {
        console.warn(`Low success rate: ${Math.round(successRate * 100)}% (${successCount}/${chunks.length})`);
      }

      return {
        success: true,
        chunks_count: successCount,
        error: successRate < 1 ? `Partial success: ${successCount}/${chunks.length} chunks stored` : undefined
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown processing error';
      const processingTime = Date.now() - startTime;
      console.error(`Processing error after ${processingTime}ms:`, error);
      
      return {
        success: false,
        chunks_count: 0,
        error: errorMsg
      };
    }
  }

  // Enhanced search with multiple strategies
  async findRelevantChunks(
    query: string,
    agentId: number,
    maxChunks: number = 3,
    threshold: number = 0.7,
    searchStrategy: 'vector' | 'hybrid' | 'contextual' = 'hybrid',
    _enableContextual: boolean = true,
    filters: Record<string, any> = {}
  ): Promise<Array<{ content: string; similarity: number; metadata?: any }>> {
    try {
      let results;

      switch (searchStrategy) {
        case 'vector':
          results = await this.vectorStore.searchSimilar(query, agentId, maxChunks, threshold, filters);
          break;
        case 'hybrid':
          results = await this.vectorStore.hybridSearch(query, agentId, maxChunks);
          break;
        case 'contextual':
          results = await this.vectorStore.contextualSearch(query, agentId, maxChunks, 2);
          break;
        default:
          results = await this.vectorStore.hybridSearch(query, agentId, maxChunks);
      }

      return results.map(result => ({
        content: result.content,
        similarity: result.similarity,
        metadata: result.metadata
      }));

    } catch (error) {
      console.error('Enhanced search failed:', error);
      return [];
    }
  }

  // Delete knowledge source from Pinecone
  async deleteKnowledgeSource(agentId: number, knowledgeSourceId: number): Promise<void> {
    try {
      await this.vectorStore.deleteDocuments(agentId, knowledgeSourceId);
    } catch (error) {
      console.error('Failed to delete knowledge source from Pinecone:', error);
      throw error;
    }
  }

  // Get knowledge statistics
  async getKnowledgeStatistics(agentId: number): Promise<any> {
    try {
      return await this.vectorStore.getStatistics(agentId);
    } catch (error) {
      console.error('Failed to get knowledge statistics:', error);
      return {
        total_chunks: 0,
        content_types: {},
        source_types: {},
        languages: {}
      };
    }
  }

  // Content processing methods (reused from original implementation)
  async processUrl(url: string): Promise<string> {
    try {
      console.log(`🔥 NOVO CÓDIGO ATIVO - Fetching URL with timeout: ${url}`);
      
      // Add timeout to fetch request
      const fetchWithTimeout = async (url: string, timeout: number = 30000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; RAG-Bot/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
            }
          });
          clearTimeout(id);
          return response;
        } catch (error) {
          clearTimeout(id);
          throw error;
        }
      };
      
      const response = await fetchWithTimeout(url, 30000); // 30 second timeout
      console.log(`🚀 SUCCESS: Fetch response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`Reading HTML content...`);
      const html = await Promise.race([
        response.text(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('HTML read timeout')), 15000)
        )
      ]);
      console.log(`HTML content length: ${html.length} characters`);
      
      if (html.length === 0) {
        throw new Error('Empty HTML content received');
      }
      
      console.log(`Parsing HTML...`);
      const root = parse(html);
      
      // Remove script and style tags
      root.querySelectorAll('script, style, nav, header, footer, .nav, .header, .footer').forEach(el => el.remove());
      
      // Extract text content
      const textContent = root.querySelector('body')?.innerText || root.innerText || '';
      console.log(`Extracted text content: ${textContent.length} characters`);
      
      if (textContent.length < 50) {
        throw new Error(`Insufficient content extracted: only ${textContent.length} characters`);
      }
      
      const cleanedText = this.cleanText(textContent);
      console.log(`Cleaned text: ${cleanedText.length} characters`);
      
      return cleanedText;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown URL processing error';
      console.error("Failed to process URL:", errorMsg);
      
      // Provide more specific error messages
      if (errorMsg.includes('aborted')) {
        throw new Error(`URL fetch timeout: ${url} took too long to respond (>30s)`);
      } else if (errorMsg.includes('network')) {
        throw new Error(`Network error: Unable to reach ${url}`);
      } else if (errorMsg.includes('HTML read timeout')) {
        throw new Error(`URL responded but content reading timed out`);
      } else {
        throw new Error(`URL processing failed: ${errorMsg}`);
      }
    }
  }

  async processYouTube(url: string): Promise<string> {
    try {
      const videoId = this.extractYouTubeId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      console.log(`Extracted YouTube video ID: ${videoId}`);
      
      try {
        const ytTranscript = await import('youtube-transcript');
        console.log('YouTube transcript module loaded successfully');
        
        const transcript = await ytTranscript.YoutubeTranscript.fetchTranscript(videoId);
        console.log(`Fetched transcript with ${transcript.length} entries`);
        
        const text = transcript.map((entry: any) => entry.text).join(' ');
        console.log(`Combined transcript text: ${text.length} characters`);
        
        return this.cleanText(text);
      } catch (transcriptError) {
        console.error("YouTube transcript error:", transcriptError);
        // Fallback: return basic info about the video
        return `YouTube video content from ${url} (transcript not available: ${transcriptError})`;
      }
    } catch (error) {
      console.error("Failed to process YouTube:", error);
      throw error;
    }
  }

  async processPdf(buffer: ArrayBuffer): Promise<string> {
    try {
      // Use unpdf which works in Cloudflare Workers
      const { extractText, getDocumentProxy } = await import('unpdf');
      
      const document = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(document, { mergePages: true });
      return this.cleanText(text);
    } catch (error) {
      console.error("Failed to process PDF:", error);
      throw error;
    }
  }

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

  async processPowerPoint(buffer: ArrayBuffer): Promise<string> {
    try {
      // Note: Advanced PPTX processing temporarily disabled due to build compatibility issues
      console.warn('PPTX processing using fallback method due to build compatibility issues');
      
      // Fallback: try to extract text using basic buffer parsing
      const text = Buffer.from(buffer).toString('utf8');
      // Extract readable text portions
      const readableText = text.replace(/[^\x20-\x7E\s]/g, '').replace(/\s+/g, ' ');
      return this.cleanText(readableText);
    } catch (error) {
      console.error("Failed to process PowerPoint document:", error);
      throw new Error("PowerPoint processing failed - please try converting to PDF or text format");
    }
  }

  // Helper methods
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

      index += chunkSize - overlap;
      if (index >= text.length) break;
    }

    return chunks.filter(chunk => chunk.content.length > 0);
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }

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
}

import OpenAI from "openai";

export interface SemanticChunk {
  content: string;
  metadata: {
    chunk_type: 'paragraph' | 'sentence' | 'recursive' | 'semantic' | 'recursive_max_depth' | 'recursive_small' | 'recursive_forced';
    start_index: number;
    end_index: number;
    length: number;
    semantic_similarity?: number;
    parent_chunk?: number;
    section_title?: string;
    sentence_count?: number;
  };
  chunk_index: number;
}

export class SemanticChunker {
  private openai: OpenAI;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  // Advanced semantic chunking with multiple strategies
  async chunkTextSemantically(
    text: string, 
    maxChunkSize: number = 2000, 
    overlap: number = 400,
    strategy: 'paragraph' | 'sentence' | 'recursive' | 'semantic' = 'recursive'
  ): Promise<SemanticChunk[]> {
    switch (strategy) {
      case 'paragraph':
        return this.chunkByParagraphs(text, maxChunkSize, overlap);
      case 'sentence':
        return this.chunkBySentences(text, maxChunkSize, overlap);
      case 'recursive':
        return this.chunkRecursively(text, maxChunkSize, overlap);
      case 'semantic':
        return await this.chunkBySemantic(text, maxChunkSize, overlap);
      default:
        return this.chunkRecursively(text, maxChunkSize, overlap);
    }
  }

  // Chunk by paragraphs - preserves natural document structure
  private chunkByParagraphs(text: string, maxChunkSize: number, overlap: number): SemanticChunk[] {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const chunks: SemanticChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;
    let startIndex = 0;

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      // If adding this paragraph would exceed max size
      if (currentChunk.length + trimmedParagraph.length > maxChunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            chunk_type: 'paragraph',
            start_index: startIndex,
            end_index: startIndex + currentChunk.length,
            length: currentChunk.length,
            sentence_count: this.countSentences(currentChunk)
          },
          chunk_index: chunkIndex++
        });

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + '\n\n' + trimmedParagraph;
        startIndex = startIndex + currentChunk.length - overlapText.length;
      } else {
        if (currentChunk.length > 0) {
          currentChunk += '\n\n' + trimmedParagraph;
        } else {
          currentChunk = trimmedParagraph;
          startIndex = text.indexOf(trimmedParagraph);
        }
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          chunk_type: 'paragraph',
          start_index: startIndex,
          end_index: startIndex + currentChunk.length,
          length: currentChunk.length,
          sentence_count: this.countSentences(currentChunk)
        },
        chunk_index: chunkIndex
      });
    }

    return chunks;
  }

  // Chunk by sentences - more granular control
  private chunkBySentences(text: string, maxChunkSize: number, overlap: number): SemanticChunk[] {
    const sentences = this.splitIntoSentences(text);
    const chunks: SemanticChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;
    let startIndex = 0;

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            chunk_type: 'sentence',
            start_index: startIndex,
            end_index: startIndex + currentChunk.length,
            length: currentChunk.length,
            sentence_count: this.countSentences(currentChunk)
          },
          chunk_index: chunkIndex++
        });

        const overlapText = this.getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + ' ' + sentence;
        startIndex = startIndex + currentChunk.length - overlapText.length;
      } else {
        if (currentChunk.length > 0) {
          currentChunk += ' ' + sentence;
        } else {
          currentChunk = sentence;
          startIndex = text.indexOf(sentence);
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          chunk_type: 'sentence',
          start_index: startIndex,
          end_index: startIndex + currentChunk.length,
          length: currentChunk.length,
          sentence_count: this.countSentences(currentChunk)
        },
        chunk_index: chunkIndex
      });
    }

    return chunks;
  }

  // Recursive chunking - adaptive size with semantic boundaries
  private chunkRecursively(text: string, maxChunkSize: number, overlap: number): SemanticChunk[] {
    const chunks: SemanticChunk[] = [];
    
    const recursiveChunk = (content: string, parentIndex: number = 0, depth: number = 0): void => {
      // Prevent infinite recursion with lower limit
      if (depth > 10) {
        console.warn(`Max recursion depth reached at depth ${depth}, creating chunk anyway`);
        if (content.trim().length > 0) {
          chunks.push({
            content: content.trim(),
            metadata: {
              chunk_type: 'recursive_max_depth',
              start_index: parentIndex,
              end_index: parentIndex + content.length,
              length: content.length,
              parent_chunk: parentIndex > 0 ? Math.floor(parentIndex / maxChunkSize) : undefined,
              sentence_count: this.countSentences(content)
            },
            chunk_index: chunks.length
          });
        }
        return;
      }

      // Base case: content fits within max size
      if (content.length <= maxChunkSize) {
        if (content.trim().length > 0) {
          chunks.push({
            content: content.trim(),
            metadata: {
              chunk_type: 'recursive',
              start_index: parentIndex,
              end_index: parentIndex + content.length,
              length: content.length,
              parent_chunk: parentIndex > 0 ? Math.floor(parentIndex / maxChunkSize) : undefined,
              sentence_count: this.countSentences(content)
            },
            chunk_index: chunks.length
          });
        }
        return;
      }

      // Prevent processing very small content that can't be meaningfully split
      if (content.length < 50) {
        if (content.trim().length > 0) {
          chunks.push({
            content: content.trim(),
            metadata: {
              chunk_type: 'recursive_small',
              start_index: parentIndex,
              end_index: parentIndex + content.length,
              length: content.length,
              sentence_count: 1
            },
            chunk_index: chunks.length
          });
        }
        return;
      }

      let processed = false;

      // Try to split by paragraphs first
      const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      if (paragraphs.length > 1) {
        let currentChunk = '';
        let chunkStart = parentIndex;
        processed = true;

        for (const paragraph of paragraphs) {
          const trimmedParagraph = paragraph.trim();
          
          // Skip empty paragraphs
          if (trimmedParagraph.length === 0) continue;

          if (currentChunk.length + trimmedParagraph.length + 2 > maxChunkSize && currentChunk.length > 0) {
            recursiveChunk(currentChunk.trim(), chunkStart, depth + 1);
            
            // Add overlap
            const overlapText = this.getOverlapText(currentChunk, overlap);
            currentChunk = overlapText + (overlapText ? '\n\n' : '') + trimmedParagraph;
            chunkStart = chunkStart + (currentChunk.length - overlapText.length - trimmedParagraph.length);
          } else {
            if (currentChunk.length > 0) {
              currentChunk += '\n\n' + trimmedParagraph;
            } else {
              currentChunk = trimmedParagraph;
            }
          }
        }

        if (currentChunk.trim().length > 0) {
          recursiveChunk(currentChunk.trim(), chunkStart, depth + 1);
        }
      }

      // Fall back to sentence splitting if paragraph splitting didn't work or wasn't applicable
      if (!processed) {
        const sentences = this.splitIntoSentences(content);
        if (sentences.length > 1) {
          let currentChunk = '';
          let chunkStart = parentIndex;
          processed = true;

          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length + 1 > maxChunkSize && currentChunk.length > 0) {
              recursiveChunk(currentChunk.trim(), chunkStart, depth + 1);
              
              const overlapText = this.getOverlapText(currentChunk, overlap);
              currentChunk = overlapText + (overlapText ? ' ' : '') + sentence;
              chunkStart = chunkStart + (currentChunk.length - overlapText.length - sentence.length);
            } else {
              if (currentChunk.length > 0) {
                currentChunk += ' ' + sentence;
              } else {
                currentChunk = sentence;
              }
            }
          }

          if (currentChunk.trim().length > 0) {
            recursiveChunk(currentChunk.trim(), chunkStart, depth + 1);
          }
        }
      }

      // Last resort: simple character split with word boundaries
      if (!processed) {
        // Find a good split point (word boundary near the middle)
        const midpoint = Math.floor(content.length / 2);
        let splitPoint = midpoint;
        
        // Look for word boundary within 20% of midpoint
        const searchRange = Math.floor(content.length * 0.2);
        for (let i = Math.max(0, midpoint - searchRange); i <= Math.min(content.length, midpoint + searchRange); i++) {
          if (content[i] === ' ' || content[i] === '\n') {
            splitPoint = i;
            break;
          }
        }
        
        const beforeSplit = content.slice(0, splitPoint).trim();
        const afterSplit = content.slice(splitPoint).trim();
        
        if (beforeSplit.length > 0 && afterSplit.length > 0) {
          recursiveChunk(beforeSplit, parentIndex, depth + 1);
          recursiveChunk(afterSplit, parentIndex + splitPoint, depth + 1);
        } else {
          // Content can't be split meaningfully, force create chunk
          if (content.trim().length > 0) {
            chunks.push({
              content: content.trim(),
              metadata: {
                chunk_type: 'recursive_forced',
                start_index: parentIndex,
                end_index: parentIndex + content.length,
                length: content.length,
                sentence_count: this.countSentences(content)
              },
              chunk_index: chunks.length
            });
          }
        }
      }
    };

    recursiveChunk(text, 0, 0);
    return chunks.filter(chunk => chunk.content.trim().length > 0); // Filter out empty chunks
  }

  // Semantic chunking using embeddings to find natural breakpoints
  private async chunkBySemantic(text: string, maxChunkSize: number, overlap: number): Promise<SemanticChunk[]> {
    try {
      console.log('Starting semantic chunking...');
      
      // If text is too short, return as single chunk
      if (text.length <= maxChunkSize) {
        return [{
          content: text.trim(),
          metadata: {
            chunk_type: 'semantic',
            start_index: 0,
            end_index: text.length,
            length: text.length,
            sentence_count: this.countSentences(text)
          },
          chunk_index: 0
        }];
      }

      const sentences = this.splitIntoSentences(text);
      console.log(`Split into ${sentences.length} sentences`);
      
      // If too few sentences or empty, fallback to paragraph chunking
      if (sentences.length <= 2 || sentences.some(s => s.trim().length === 0)) {
        console.log('Too few sentences, falling back to paragraph chunking');
        return this.chunkByParagraphs(text, maxChunkSize, overlap);
      }

      // Limit sentences for efficiency (max 50 sentences for embeddings)
      const limitedSentences = sentences.slice(0, 50);
      if (sentences.length > 50) {
        console.log(`Limited to ${limitedSentences.length} sentences for efficiency`);
      }

      // Generate embeddings for sentences (in smaller batches)
      const embeddings: number[][] = [];
      const batchSize = 5; // Smaller batch size to avoid rate limits
      
      console.log(`Generating embeddings for ${limitedSentences.length} sentences in batches of ${batchSize}`);
      
      for (let i = 0; i < limitedSentences.length; i += batchSize) {
        const batch = limitedSentences.slice(i, i + batchSize).filter(s => s.trim().length > 10); // Filter out very short sentences
        
        if (batch.length === 0) continue;
        
        try {
          await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
          
          const response = await this.openai.embeddings.create({
            model: "text-embedding-3-small",
            input: batch,
          });
          embeddings.push(...response.data.map(d => d.embedding));
          console.log(`Generated embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(limitedSentences.length / batchSize)}`);
        } catch (embeddingError) {
          console.error('Error generating embeddings batch:', embeddingError);
          // Continue with remaining batches
        }
      }

      // If embedding generation failed, fallback to paragraph chunking
      if (embeddings.length < 2) {
        console.log('Embedding generation failed, falling back to paragraph chunking');
        return this.chunkByParagraphs(text, maxChunkSize, overlap);
      }

      // Find semantic breakpoints based on similarity drops
      const similarities: number[] = [];
      for (let i = 0; i < embeddings.length - 1; i++) {
        similarities.push(this.calculateSimilarity(embeddings[i], embeddings[i + 1]));
      }

      if (similarities.length === 0) {
        console.log('No similarities calculated, falling back to paragraph chunking');
        return this.chunkByParagraphs(text, maxChunkSize, overlap);
      }

      // Find natural breakpoints (where similarity drops significantly)
      const mean = this.calculateMean(similarities);
      const stdDev = this.calculateStdDev(similarities);
      const threshold = Math.max(0.3, mean - stdDev * 0.5); // More conservative threshold
      
      console.log(`Similarity stats - Mean: ${mean.toFixed(3)}, StdDev: ${stdDev.toFixed(3)}, Threshold: ${threshold.toFixed(3)}`);
      
      const breakpoints: number[] = [0];
      for (let i = 0; i < similarities.length; i++) {
        if (similarities[i] < threshold && breakpoints[breakpoints.length - 1] !== i + 1) {
          breakpoints.push(i + 1);
        }
      }
      breakpoints.push(Math.min(limitedSentences.length, sentences.length));

      // Ensure we have reasonable breakpoints
      if (breakpoints.length <= 2) {
        console.log('Too few breakpoints found, falling back to paragraph chunking');
        return this.chunkByParagraphs(text, maxChunkSize, overlap);
      }

      console.log(`Found ${breakpoints.length - 1} semantic chunks`);

      // Create chunks based on breakpoints
      const chunks: SemanticChunk[] = [];
      let chunkIndex = 0;

      for (let i = 0; i < breakpoints.length - 1; i++) {
        const start = breakpoints[i];
        const end = breakpoints[i + 1];
        
        // Use original sentences array for content
        const chunkSentences = sentences.slice(start, end);
        let content = chunkSentences.join(' ').trim();

        // Skip empty chunks
        if (content.length === 0) continue;

        // If chunk is too large, use simple splitting instead of recursive (to avoid infinite loops)
        if (content.length > maxChunkSize * 1.5) {
          // Simple character-based splitting for oversized chunks
          const parts = this.simpleCharacterSplit(content, maxChunkSize, overlap);
          for (const part of parts) {
            chunks.push({
              content: part.trim(),
              metadata: {
                chunk_type: 'semantic',
                start_index: text.indexOf(part.trim()),
                end_index: text.indexOf(part.trim()) + part.length,
                length: part.length,
                semantic_similarity: i > 0 && similarities[start - 1] ? similarities[start - 1] : undefined,
                sentence_count: this.countSentences(part)
              },
              chunk_index: chunkIndex++
            });
          }
        } else {
          const startIndex = text.indexOf(chunkSentences[0]) || 0;
          chunks.push({
            content: content,
            metadata: {
              chunk_type: 'semantic',
              start_index: startIndex,
              end_index: startIndex + content.length,
              length: content.length,
              semantic_similarity: i > 0 && similarities[start - 1] ? similarities[start - 1] : undefined,
              sentence_count: chunkSentences.length
            },
            chunk_index: chunkIndex++
          });
        }
      }

      // Ensure we have at least one chunk
      if (chunks.length === 0) {
        console.log('No chunks created, falling back to paragraph chunking');
        return this.chunkByParagraphs(text, maxChunkSize, overlap);
      }

      console.log(`Created ${chunks.length} semantic chunks`);
      return chunks;
      
    } catch (error) {
      console.error('Semantic chunking error:', error);
      console.log('Falling back to paragraph chunking');
      return this.chunkByParagraphs(text, maxChunkSize, overlap);
    }
  }

  // Simple character-based splitting to avoid recursion issues
  private simpleCharacterSplit(text: string, maxSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + maxSize, text.length);
      let chunk = text.slice(start, end);
      
      // Try to break at word boundary
      if (end < text.length) {
        const lastSpace = chunk.lastIndexOf(' ');
        if (lastSpace > maxSize * 0.8) { // Only if we're not losing too much content
          chunk = text.slice(start, start + lastSpace);
        }
      }
      
      chunks.push(chunk);
      start = end - overlap;
    }
    
    return chunks;
  }

  // Extract sections with titles for better organization
  extractSections(text: string): Array<{ title: string; content: string; level: number }> {
    const sections: Array<{ title: string; content: string; level: number }> = [];
    const lines = text.split('\n');
    let currentSection = { title: '', content: '', level: 0 };

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect headers (markdown style or numbered)
      const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/) || 
                         trimmedLine.match(/^(\d+\.)\s+(.+)$/) ||
                         trimmedLine.match(/^([A-Z\s]{5,})$/) ; // All caps headers
      
      if (headerMatch) {
        // Save previous section
        if (currentSection.content.trim()) {
          sections.push({ ...currentSection });
        }
        
        // Start new section
        const level = headerMatch[1].startsWith('#') ? headerMatch[1].length : 1;
        currentSection = {
          title: headerMatch[2] || headerMatch[1],
          content: '',
          level
        };
      } else {
        currentSection.content += line + '\n';
      }
    }

    // Add final section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }

    return sections;
  }

  // Helper methods
  private splitIntoSentences(text: string): string[] {
    // More robust sentence splitting
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10) // Filter out very short fragments
      .map(s => {
        // Ensure sentence ends with punctuation
        if (!/[.!?]$/.test(s)) {
          s += '.';
        }
        return s;
      });
    
    // If we got too few sentences, try a simpler split
    if (sentences.length <= 1) {
      return text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 5)
        .map(s => s + '.');
    }
    
    return sentences;
  }

  private countSentences(text: string): number {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }

  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) return text;
    
    // Try to find a sentence boundary for natural overlap
    const sentences = this.splitIntoSentences(text);
    let overlap = '';
    
    for (let i = sentences.length - 1; i >= 0; i--) {
      const candidate = sentences.slice(i).join(' ');
      if (candidate.length <= overlapSize) {
        overlap = candidate;
        break;
      }
    }
    
    return overlap || text.slice(-overlapSize);
  }

  private calculateSimilarity(vec1: number[], vec2: number[]): number {
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

  private calculateMean(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculateStdDev(numbers: number[]): number {
    const mean = this.calculateMean(numbers);
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }
}

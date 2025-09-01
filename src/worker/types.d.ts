declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
  }
  
  function parse(buffer: Buffer): Promise<PDFData>;
  export = parse;
}

declare module 'mammoth' {
  interface ExtractResult {
    value: string;
    messages: any[];
  }
  
  export function extractRawText(options: { buffer: Buffer }): Promise<ExtractResult>;
}

declare module 'youtube-transcript' {
  interface TranscriptEntry {
    text: string;
    duration: number;
    offset: number;
  }
  
  export class YoutubeTranscript {
    static fetchTranscript(videoId: string): Promise<TranscriptEntry[]>;
  }
}

declare module 'node-pptx' {
  interface Slide {
    getTextContent(): string;
    getNotes(): string;
  }
  
  export class PPTX {
    constructor(buffer: Buffer);
    getSlides(): Slide[];
  }
}

declare module '@pinecone-database/pinecone' {
  export interface PineconeConfiguration {
    apiKey: string;
    environment?: string;
  }

  export interface Vector {
    id: string;
    values: number[];
    metadata?: Record<string, any>;
  }

  export interface QueryRequest {
    vector?: number[];
    topK: number;
    filter?: Record<string, any>;
    includeMetadata?: boolean;
    includeValues?: boolean;
    namespace?: string;
  }

  export interface QueryMatch {
    id: string;
    score?: number;
    values?: number[];
    metadata?: Record<string, any>;
  }

  export interface QueryResponse {
    matches?: QueryMatch[];
    namespace?: string;
  }

  export interface IndexStats {
    namespaces: Record<string, any>;
    dimension: number;
    indexFullness: number;
    totalVectorCount: number;
  }

  export interface Index {
    upsert(vectors: Vector[]): Promise<void>;
    query(request: QueryRequest): Promise<QueryResponse>;
    deleteMany(filter: Record<string, any>): Promise<void>;
    describeIndexStats(): Promise<IndexStats>;
    namespace(name: string): Index;
  }

  export class Pinecone {
    constructor(config: PineconeConfiguration);
    index(name: string): Index;
  }
}

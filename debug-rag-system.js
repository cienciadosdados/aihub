/**
 * RAG SYSTEM DIAGNOSTIC TOOL
 * 
 * Comprehensive testing and debugging script for the AI Agent Hub RAG system.
 * Identifies issues with knowledge processing, API connections, and provides
 * detailed reporting for troubleshooting.
 * 
 * Usage:
 * - Run in browser console while on the AI Agent Hub interface
 * - Or run with Node.js: node debug-rag-system.js
 * 
 * Features:
 * - Environment validation
 * - End-to-end RAG testing
 * - Real-time progress monitoring
 * - Error analysis and recommendations
 */

class RAGSystemDiagnostic {
  constructor(baseUrl = 'http://127.0.0.1:8787') {
    this.baseUrl = baseUrl;
    this.results = {
      environment: {},
      connectivity: {},
      processing: {},
      errors: [],
      recommendations: []
    };
  }

  // Utility function for logging with timestamps
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // Test API connectivity
  async testConnectivity() {
    this.log('Testing API connectivity...');
    
    try {
      // Test basic API endpoint
      const response = await fetch(`${this.baseUrl}/api/workspaces`);
      
      if (response.status === 401) {
        this.results.connectivity.api = 'unauthorized';
        this.log('API is running but requires authentication', 'warning');
        return true;
      } else if (response.ok) {
        this.results.connectivity.api = 'ok';
        this.log('API is accessible', 'success');
        return true;
      } else {
        throw new Error(`API returned status: ${response.status}`);
      }
    } catch (error) {
      this.results.connectivity.api = 'failed';
      this.results.errors.push(`API connectivity failed: ${error.message}`);
      this.log(`API connectivity failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Test environment variables and configuration
  async testEnvironment() {
    this.log('Testing environment configuration...');

    try {
      // Check if we can access worker environment info
      const response = await fetch(`${this.baseUrl}/api/agents/1/knowledge-settings`);
      
      if (response.status === 401) {
        this.log('Cannot validate environment without auth - this is expected', 'warning');
        this.results.environment.status = 'auth_required';
        return true;
      }

      // If we get here, we have access
      const data = await response.json();
      this.results.environment = {
        status: 'accessible',
        knowledge_settings: data
      };
      
      this.log('Environment appears correctly configured', 'success');
      return true;
    } catch (error) {
      this.results.environment.status = 'error';
      this.results.errors.push(`Environment test failed: ${error.message}`);
      this.log(`Environment test failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Monitor knowledge source processing
  async monitorProcessing(sourceId, maxWaitTime = 300000) { // 5 minutes max
    this.log(`Monitoring knowledge source ${sourceId} processing...`);
    
    const startTime = Date.now();
    let lastProgress = -1;
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(`${this.baseUrl}/api/knowledge-sources/${sourceId}/status`);
        
        if (response.status === 401) {
          this.log('Cannot monitor without authentication', 'warning');
          break;
        }
        
        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }
        
        const status = await response.json();
        
        // Log progress if it changed
        if (status.progress.percentage !== lastProgress) {
          this.log(`Progress: ${status.progress.percentage}% - ${status.progress.stage} - ${status.progress.message}`);
          lastProgress = status.progress.percentage;
        }
        
        // Check final status
        if (status.status === 'completed') {
          this.log('Processing completed successfully!', 'success');
          this.results.processing[sourceId] = {
            status: 'completed',
            duration: Date.now() - startTime,
            metadata: status.metadata
          };
          return true;
        } else if (status.status === 'failed') {
          this.log(`Processing failed: ${status.progress.message}`, 'error');
          this.results.processing[sourceId] = {
            status: 'failed',
            error: status.progress.message,
            duration: Date.now() - startTime
          };
          this.results.errors.push(`Source ${sourceId} processing failed: ${status.progress.message}`);
          return false;
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        this.log(`Error monitoring source ${sourceId}: ${error.message}`, 'error');
        this.results.errors.push(`Monitoring error for source ${sourceId}: ${error.message}`);
        break;
      }
    }
    
    // Timeout
    this.log(`Monitoring timed out for source ${sourceId}`, 'warning');
    this.results.processing[sourceId] = {
      status: 'timeout',
      duration: maxWaitTime
    };
    return false;
  }

  // Test with a simple text source
  async testTextProcessing() {
    this.log('Testing text processing...');
    
    const testText = `
      This is a test document for the RAG system diagnostic.
      It contains multiple paragraphs to test the chunking algorithms.
      
      The semantic chunker should break this into appropriate chunks
      based on the content structure and semantic meaning.
      
      This test helps identify issues with:
      - Content extraction
      - Semantic chunking
      - Vector embedding generation
      - Pinecone storage operations
      
      If you can see this text in your knowledge base after processing,
      the RAG system is working correctly!
    `;
    
    try {
      const response = await fetch(`${this.baseUrl}/api/agents/3/knowledge-sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'RAG Diagnostic Test',
          type: 'text',
          content: testText
        })
      });
      
      if (response.status === 401) {
        this.log('Cannot test without authentication - please test manually', 'warning');
        return false;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to create test source: ${response.status}`);
      }
      
      const result = await response.json();
      this.log(`Created test knowledge source with ID: ${result.id}`);
      
      // Monitor the processing
      return await this.monitorProcessing(result.id);
      
    } catch (error) {
      this.log(`Text processing test failed: ${error.message}`, 'error');
      this.results.errors.push(`Text processing test failed: ${error.message}`);
      return false;
    }
  }

  // Generate recommendations based on results
  generateRecommendations() {
    this.log('Generating recommendations...');
    
    const recommendations = [];
    
    // API connectivity issues
    if (this.results.connectivity.api === 'failed') {
      recommendations.push('🔧 Check that the worker is running: npm run dev:worker');
      recommendations.push('🔧 Verify the correct port (8787) and host (127.0.0.1)');
    }
    
    // Authentication issues
    if (this.results.connectivity.api === 'unauthorized') {
      recommendations.push('🔐 Authentication required - test manually through the web interface');
      recommendations.push('🔐 Ensure you are logged in to the application');
    }
    
    // Processing failures
    const failedProcessing = Object.values(this.results.processing).filter(p => p.status === 'failed');
    if (failedProcessing.length > 0) {
      recommendations.push('⚠️ Knowledge processing is failing - check API keys');
      recommendations.push('⚠️ Verify OPENAI_API_KEY and PINECONE_API_KEY are set');
      recommendations.push('⚠️ Check Pinecone index exists and is accessible');
      recommendations.push('⚠️ Review worker logs for detailed error messages');
    }
    
    // Timeout issues
    const timeoutProcessing = Object.values(this.results.processing).filter(p => p.status === 'timeout');
    if (timeoutProcessing.length > 0) {
      recommendations.push('⏱️ Processing is timing out - may indicate API rate limits');
      recommendations.push('⏱️ Check OpenAI API usage and rate limits');
      recommendations.push('⏱️ Consider reducing batch size or increasing timeouts');
    }
    
    // Environment issues
    if (this.results.errors.length > 0) {
      recommendations.push('🐛 Multiple errors detected - check worker console logs');
      recommendations.push('🐛 Verify all environment variables are properly configured');
      recommendations.push('🐛 Restart the worker to clear any stuck processes');
    }
    
    // Success case
    if (this.results.errors.length === 0 && failedProcessing.length === 0) {
      recommendations.push('✅ RAG system appears to be working correctly');
      recommendations.push('✅ Try adding knowledge sources through the web interface');
    }
    
    this.results.recommendations = recommendations;
    return recommendations;
  }

  // Generate comprehensive report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_errors: this.results.errors.length,
        connectivity_status: this.results.connectivity.api || 'not_tested',
        environment_status: this.results.environment.status || 'not_tested',
        processing_tests: Object.keys(this.results.processing).length
      },
      details: this.results,
      recommendations: this.generateRecommendations()
    };
    
    this.log('='.repeat(60));
    this.log('RAG SYSTEM DIAGNOSTIC REPORT');
    this.log('='.repeat(60));
    
    this.log(`Connectivity: ${report.summary.connectivity_status}`);
    this.log(`Environment: ${report.summary.environment_status}`);
    this.log(`Total Errors: ${report.summary.total_errors}`);
    this.log(`Processing Tests: ${report.summary.processing_tests}`);
    
    if (this.results.errors.length > 0) {
      this.log('\\nERRORS DETECTED:', 'error');
      this.results.errors.forEach(error => this.log(`  • ${error}`, 'error'));
    }
    
    this.log('\\nRECOMMENDATIONS:');
    report.recommendations.forEach(rec => this.log(`  ${rec}`));
    
    this.log('='.repeat(60));
    
    return report;
  }

  // Run all diagnostics
  async runAllTests() {
    this.log('Starting RAG System Diagnostic...');
    this.log('This will test connectivity, environment, and knowledge processing');
    
    try {
      // Test connectivity
      await this.testConnectivity();
      
      // Test environment
      await this.testEnvironment();
      
      // Test text processing (if we have connectivity)
      if (this.results.connectivity.api === 'ok') {
        await this.testTextProcessing();
      }
      
      // Generate final report
      return this.generateReport();
      
    } catch (error) {
      this.log(`Diagnostic failed: ${error.message}`, 'error');
      this.results.errors.push(`Diagnostic failed: ${error.message}`);
      return this.generateReport();
    }
  }
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  console.log('🔍 RAG System Diagnostic Tool Loaded');
  console.log('Run: new RAGSystemDiagnostic().runAllTests()');
  window.RAGDiagnostic = RAGSystemDiagnostic;
}

// Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RAGSystemDiagnostic;
  
  // Auto-run if called directly
  if (require.main === module) {
    const diagnostic = new RAGSystemDiagnostic();
    diagnostic.runAllTests()
      .then(report => {
        console.log('\\nFull diagnostic report:', JSON.stringify(report, null, 2));
        process.exit(report.summary.total_errors > 0 ? 1 : 0);
      })
      .catch(error => {
        console.error('Diagnostic failed:', error);
        process.exit(1);
      });
  }
}
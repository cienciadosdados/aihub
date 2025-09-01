// Analytics simples e não invasivo para AI Hub
// Mantém tudo separado do código principal

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first(): Promise<any>;
  all(): Promise<{ results: any[] }>;
  run(): Promise<any>;
}

export interface AnalyticsData {
  // Métricas de uso
  total_conversations: number;
  total_agents: number;
  total_workspaces: number;
  total_documents: number;
  
  // Performance
  avg_response_time: number;
  avg_tokens_per_conversation: number;
  success_rate: number;
  
  // Últimos 7 dias
  conversations_last_7d: number;
  documents_uploaded_last_7d: number;
  active_users_last_7d: number;
  
  // Top agents
  top_agents: Array<{
    name: string;
    conversations: number;
    avg_response_time: number;
  }>;
  
  // Erros recentes
  recent_errors: Array<{
    timestamp: string;
    error: string;
    agent_id: number;
  }>;
}

export class Analytics {
  constructor(private db: D1Database) {}

  async getMetrics(): Promise<AnalyticsData> {
    try {
      // Queries básicas - todas em paralelo para performance
      const [
        totalStats,
        performanceStats,
        weeklyStats,
        topAgents,
        recentErrors
      ] = await Promise.all([
        this.getTotalStats(),
        this.getPerformanceStats(),
        this.getWeeklyStats(),
        this.getTopAgents(),
        this.getRecentErrors()
      ]);

      return {
        ...totalStats,
        ...performanceStats,
        ...weeklyStats,
        top_agents: topAgents,
        recent_errors: recentErrors
      };
    } catch (error) {
      console.error('Analytics error:', error);
      return this.getEmptyMetrics();
    }
  }

  private async getTotalStats() {
    const [conversations, agents, workspaces, documents] = await Promise.all([
      this.db.prepare('SELECT COUNT(*) as count FROM agent_executions').first(),
      this.db.prepare('SELECT COUNT(*) as count FROM agents WHERE is_active = 1').first(),
      this.db.prepare('SELECT COUNT(*) as count FROM workspaces').first(),
      this.db.prepare('SELECT COUNT(*) as count FROM knowledge_sources WHERE status = "completed"').first()
    ]);

    return {
      total_conversations: conversations?.count || 0,
      total_agents: agents?.count || 0,
      total_workspaces: workspaces?.count || 0,
      total_documents: documents?.count || 0
    };
  }

  private async getPerformanceStats() {
    const stats = await this.db.prepare(`
      SELECT 
        AVG(execution_time_ms) as avg_time,
        AVG(tokens_used) as avg_tokens,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as success_rate
      FROM agent_executions 
      WHERE created_at >= datetime('now', '-30 days')
    `).first();

    const successRate = stats?.success_rate || 0;
    console.log('Raw success rate from DB:', successRate);
    
    const finalRate = Math.min(100, Math.max(0, Math.round(successRate)));
    console.log('Final success rate:', finalRate);
    
    return {
      avg_response_time: Math.round(stats?.avg_time || 0),
      avg_tokens_per_conversation: Math.round(stats?.avg_tokens || 0),
      success_rate: finalRate
    };
  }

  private async getWeeklyStats() {
    const [conversations, documents, users] = await Promise.all([
      this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM agent_executions 
        WHERE created_at >= datetime('now', '-7 days')
      `).first(),
      this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM knowledge_sources 
        WHERE created_at >= datetime('now', '-7 days')
      `).first(),
      this.db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM agent_executions 
        WHERE created_at >= datetime('now', '-7 days')
      `).first()
    ]);

    return {
      conversations_last_7d: conversations?.count || 0,
      documents_uploaded_last_7d: documents?.count || 0,
      active_users_last_7d: users?.count || 0
    };
  }

  private async getTopAgents() {
    const { results } = await this.db.prepare(`
      SELECT 
        a.name,
        COUNT(ae.id) as conversations,
        AVG(ae.execution_time_ms) as avg_response_time
      FROM agents a
      LEFT JOIN agent_executions ae ON a.id = ae.agent_id
      WHERE ae.created_at >= datetime('now', '-30 days')
        AND ae.status = 'completed'
      GROUP BY a.id, a.name
      ORDER BY conversations DESC
      LIMIT 5
    `).all();

    return results.map((agent: any) => ({
      name: agent.name,
      conversations: agent.conversations || 0,
      avg_response_time: Math.round(agent.avg_response_time || 0)
    }));
  }

  private async getRecentErrors() {
    const { results } = await this.db.prepare(`
      SELECT 
        datetime(created_at) as timestamp,
        error_message as error,
        agent_id
      FROM agent_executions
      WHERE status = 'failed' 
        AND created_at >= datetime('now', '-24 hours')
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    return results.map((error: any) => ({
      timestamp: error.timestamp,
      error: error.error || 'Unknown error',
      agent_id: error.agent_id
    }));
  }

  private getEmptyMetrics(): AnalyticsData {
    return {
      total_conversations: 0,
      total_agents: 0,
      total_workspaces: 0,
      total_documents: 0,
      avg_response_time: 0,
      avg_tokens_per_conversation: 0,
      success_rate: 0,
      conversations_last_7d: 0,
      documents_uploaded_last_7d: 0,
      active_users_last_7d: 0,
      top_agents: [],
      recent_errors: []
    };
  }
}

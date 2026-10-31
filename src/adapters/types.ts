/**
 * Normalized protocol events between Extension Daemon and Mobile App.
 * Read-only monitoring protocol.
 */

export type AgentType = 'antigravity' | 'copilot';

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'running_tool'
  | 'waiting_approval'
  | 'done'
  | 'error';

export interface ToolCallPayload {
  id: string;
  name: string;
  args?: Record<string, any>;
  description?: string;
  requiresApproval?: boolean;
}

export interface ChatMessagePayload {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  thinking?: string;
  timestamp: number;
}

export interface NormalizedEvent {
  event: 'AGENT_STATUS' | 'STREAM_CHUNK' | 'TOOL_CALL' | 'SESSION_START' | 'INIT_SESSION';
  sessionId: string;
  agentType: AgentType;
  timestamp: number;
  status?: AgentStatus;
  type?: 'content' | 'thinking';
  sender?: 'user' | 'agent' | 'system';
  delta?: string;
  tool?: ToolCallPayload;
  history?: ChatMessagePayload[];
  error?: string;
}

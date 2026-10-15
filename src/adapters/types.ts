/**
 * Normalized protocol events between Extension Daemon and Mobile App.
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
  requiresApproval: boolean;
}

export interface NormalizedEvent {
  event: 'AGENT_STATUS' | 'STREAM_CHUNK' | 'TOOL_CALL' | 'SESSION_START';
  sessionId: string;
  agentType: AgentType;
  timestamp: number;
  status?: AgentStatus;
  type?: 'content' | 'thinking';
  delta?: string;
  tool?: ToolCallPayload;
  error?: string;
}

export interface ClientAction {
  action: 'TOOL_ACTION' | 'SEND_PROMPT' | 'PING';
  sessionId?: string;
  decision?: 'approve' | 'deny';
  feedback?: string;
  prompt?: string;
}


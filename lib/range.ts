// Range REST API Wrapper with MCP fallback for missing endpoints
import { GUARDRAILS } from './constants';
import { normalizeRiskLevel } from './utils';

const RANGE_API_BASE = 'https://api.range.org';
const RANGE_MCP_URL = 'https://api.range.org/ai/mcp';
const API_KEY = process.env.RANGE_API_KEY;
const ENABLE_MCP_FALLBACK = process.env.RANGE_MCP_FALLBACK !== 'false';
const MCP_PROTOCOL_VERSION = '2024-11-05';

if (!API_KEY) {
  console.warn('RANGE_API_KEY not set in environment variables');
}

// Track API call budget
let callCount = 0;
let mcpSessionId: string | null = null;
let mcpSessionInitPromise: Promise<string> | null = null;

export function resetCallCount() {
  callCount = 0;
}

export function getCallCount() {
  return callCount;
}

function consumeCallBudget() {
  if (callCount >= GUARDRAILS.MAX_API_CALLS_PER_RUN) {
    throw new Error(`API budget exceeded (${GUARDRAILS.MAX_API_CALLS_PER_RUN} calls max)`);
  }
  callCount++;
}

// Generic REST API call wrapper
async function callRangeAPI(endpoint: string, params: Record<string, any> = {}) {
  consumeCallBudget();

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const url = `${RANGE_API_BASE}${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-KEY': API_KEY || '',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Range API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Generic MCP tool call wrapper
async function callMCPTool(toolName: string, args: Record<string, any> = {}) {
  consumeCallBudget();

  let lastError: any = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const sessionId = await ensureMCPSession();
      const payload = await postMCP(
        {
          jsonrpc: '2.0',
          id: `mcp-${Date.now()}-${callCount}-${attempt}`,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        },
        sessionId
      );

      if (payload?.error) {
        const message = payload.error?.message || JSON.stringify(payload.error);
        if (message.includes('No valid session ID provided') && attempt === 0) {
          invalidateMCPSession();
          continue;
        }
        throw new Error(`Range MCP tool error: ${message}`);
      }

      return unwrapMCPResult(payload?.result);
    } catch (error: any) {
      lastError = error;
      if ((error?.message || '').includes('No valid session ID provided') && attempt === 0) {
        invalidateMCPSession();
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Unknown MCP tool call failure');
}

function invalidateMCPSession() {
  mcpSessionId = null;
  mcpSessionInitPromise = null;
}

async function ensureMCPSession(): Promise<string> {
  if (mcpSessionId) return mcpSessionId;
  if (mcpSessionInitPromise) return mcpSessionInitPromise;

  mcpSessionInitPromise = (async () => {
    const initializePayload = await postMCP({
      jsonrpc: '2.0',
      id: `mcp-init-${Date.now()}`,
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: {
          name: 'rangescope',
          version: '0.1.0',
        },
      },
    });

    const sessionIdFromHeader = extractSessionId(initializePayload?.__headers);
    const sessionIdFromResult =
      initializePayload?.result?.sessionId ||
      initializePayload?.result?.session_id ||
      null;

    const sessionId = sessionIdFromHeader || sessionIdFromResult;
    if (!sessionId) {
      throw new Error('Range MCP initialize did not return a session ID');
    }

    // Best-effort initialized notification; do not fail session setup on this.
    try {
      await postMCP(
        {
          jsonrpc: '2.0',
          method: 'notifications/initialized',
          params: {},
        },
        sessionId
      );
    } catch {
      // no-op
    }

    mcpSessionId = sessionId;
    return sessionId;
  })();

  try {
    return await mcpSessionInitPromise;
  } finally {
    mcpSessionInitPromise = null;
  }
}

function extractSessionId(headersObj: Record<string, string> | undefined): string | null {
  if (!headersObj) return null;
  return (
    headersObj['mcp-session-id'] ||
    headersObj['Mcp-Session-Id'] ||
    headersObj['MCP-Session-Id'] ||
    null
  );
}

async function postMCP(
  body: Record<string, any>,
  sessionId?: string
): Promise<any> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY || ''}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
  };

  if (sessionId) {
    headers['MCP-Session-Id'] = sessionId;
  }

  const response = await fetch(RANGE_MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Range MCP error (${response.status}): ${errorText}`);
  }

  const raw = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const payload = parseMCPPayload(raw, contentType);
  const responseHeaders = Object.fromEntries(response.headers.entries());
  return { ...payload, __headers: responseHeaders };
}

function parseMCPPayload(raw: string, contentType: string): any {
  const text = raw.trim();
  if (!text) return {};

  if (contentType.includes('text/event-stream')) {
    const dataLines = text
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter((line) => line && line !== '[DONE]');

    let lastParsed: any = null;
    for (const line of dataLines) {
      try {
        lastParsed = JSON.parse(line);
      } catch {
        // Ignore non-JSON SSE data chunks.
      }
    }

    if (lastParsed) return lastParsed;
    throw new Error(`Range MCP error: unable to parse SSE payload: ${text.slice(0, 200)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Range MCP error: non-JSON response: ${text.slice(0, 200)}`);
  }
}

function shouldUseMCPFallback(error: any): boolean {
  if (!ENABLE_MCP_FALLBACK) return false;
  const message = error?.message || '';
  return message.includes('Range API error (404)');
}

function combineErrors(restError: any, mcpError: any): string {
  const restMessage = restError?.message || String(restError);
  const mcpMessage = mcpError?.message || String(mcpError);
  return `${restMessage}; MCP fallback failed: ${mcpMessage}`;
}

function parseJSONSafe(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function unwrapMCPResult(result: any): any {
  if (!result) return result;

  if (result.structuredContent) {
    return result.structuredContent;
  }

  if (Array.isArray(result.content)) {
    for (const item of result.content) {
      if (item?.type === 'text' && typeof item.text === 'string') {
        const parsed = parseJSONSafe(item.text);
        if (parsed !== null) return parsed;
      }
    }

    const textParts = result.content
      .filter((item: any) => item?.type === 'text' && typeof item.text === 'string')
      .map((item: any) => item.text)
      .join('\n')
      .trim();

    if (textParts) return { text: textParts };
  }

  return result;
}

function normalizeConnectionsResponse(payload: any, address: string, network: string) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const connections = Array.isArray(source.connections)
    ? source.connections
    : Array.isArray(source.counterparties)
      ? source.counterparties
      : Array.isArray(source.data)
        ? source.data
        : Array.isArray(payload)
          ? payload
          : [];

  return {
    ...source,
    address: source.address || address,
    network: source.network || network,
    connections,
  };
}

function normalizeFundingResponse(payload: any, address: string, network: string): any | null {
  if (!payload) return null;

  if (Array.isArray(payload)) {
    return payload.length > 0 ? normalizeFundingResponse(payload[0], address, network) : null;
  }

  if (typeof payload === 'object') {
    return {
      ...payload,
      address: payload.address || address,
      network: payload.network || network,
    };
  }

  return { address, network, raw: payload };
}

function normalizeAssetFlowResponse(payload: any, address: string, network: string) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const flows = Array.isArray(source.flows)
    ? source.flows
    : Array.isArray(source.data)
      ? source.data
      : Array.isArray(payload)
        ? payload
        : [];

  return {
    ...source,
    address: source.address || address,
    network: source.network || network,
    flows,
  };
}

function normalizeBalanceResponse(payload: any, address: string, network: string) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const balances = Array.isArray(source.balances)
    ? source.balances
    : Array.isArray(source.data)
      ? source.data
      : Array.isArray(payload)
        ? payload
        : [];

  return {
    ...source,
    address: source.address || address,
    network: source.network || network,
    balances,
  };
}

function normalizeTransfersResponse(payload: any, address: string) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const transfers = Array.isArray(source.transfers)
    ? source.transfers
    : Array.isArray(source.data)
      ? source.data
      : Array.isArray(payload)
        ? payload
        : [];

  return {
    ...source,
    address: source.address || address,
    transfers,
  };
}

// Risk & Sanctions
export async function getAddressRisk(address: string, network?: string) {
  try {
    const result = await callRangeAPI('/v1/risk/address', { address, network });

    // Normalize risk level ("VERY LOW RISK" -> "VERY_LOW")
    if (result.riskLevel) {
      result.riskLevel = normalizeRiskLevel(result.riskLevel);
    }

    return result;
  } catch (error: any) {
    console.error('getAddressRisk error:', error.message);
    return {
      address,
      network: network || 'unknown',
      riskLevel: 'UNKNOWN',
      error: error.message,
    };
  }
}

export async function checkSanctions(address: string, network?: string, includeDetails?: boolean) {
  try {
    const params: Record<string, any> = {};
    if (network) {
      params.network = network;
    }
    if (includeDetails !== undefined) {
      params.include_details = includeDetails;
    }

    const response = await callRangeAPI(`/v1/risk/sanctions/${address}`, params);

    return {
      address,
      isSanctioned: response.is_ofac_sanctioned || false,
      isBlacklisted: response.is_token_blacklisted || false,
      details: response,
    };
  } catch (error: any) {
    console.error('checkSanctions error:', error.message);
    return {
      address,
      isSanctioned: false,
      isBlacklisted: false,
      error: error.message,
    };
  }
}

// Address Intelligence
export async function getAddressInfo(address: string, network: string) {
  try {
    return await callRangeAPI('/v1/address', { address, network });
  } catch (error: any) {
    console.error('getAddressInfo error:', error.message);
    return {
      address,
      network,
      error: error.message,
    };
  }
}

export async function getAddressConnections(
  address: string,
  network: string,
  size: number = GUARDRAILS.MAX_COUNTERPARTIES
) {
  try {
    const rest = await callRangeAPI('/v1/data/address/connections', { address, network, size });
    return normalizeConnectionsResponse(rest, address, network);
  } catch (error: any) {
    if (shouldUseMCPFallback(error)) {
      try {
        const mcp = await callMCPTool('get_address_connections', { address, network, size });
        return normalizeConnectionsResponse(mcp, address, network);
      } catch (mcpError: any) {
        console.error('getAddressConnections MCP fallback error:', mcpError.message);
        return {
          address,
          network,
          connections: [],
          error: combineErrors(error, mcpError),
        };
      }
    }

    console.error('getAddressConnections error:', error.message);
    return {
      address,
      network,
      connections: [],
      error: error.message,
    };
  }
}

export async function getAddressFundedBy(address: string, network: string) {
  try {
    const rest = await callRangeAPI('/v1/data/address/funded-by', { address, network });
    return normalizeFundingResponse(rest, address, network);
  } catch (error: any) {
    if (shouldUseMCPFallback(error)) {
      try {
        const mcp = await callMCPTool('get_address_funded_by', { address, network });
        return normalizeFundingResponse(mcp, address, network);
      } catch (mcpError: any) {
        console.error('getAddressFundedBy MCP fallback error:', mcpError.message);
        return {
          address,
          network,
          error: combineErrors(error, mcpError),
        };
      }
    }

    console.error('getAddressFundedBy error:', error.message);
    return {
      address,
      network,
      error: error.message,
    };
  }
}

export async function getAddressAssetFlow(address: string, network: string) {
  try {
    const rest = await callRangeAPI('/v1/data/address/asset-flow', { address, network });
    return normalizeAssetFlowResponse(rest, address, network);
  } catch (error: any) {
    if (shouldUseMCPFallback(error)) {
      try {
        const mcp = await callMCPTool('get_address_asset_flow', { address, network });
        return normalizeAssetFlowResponse(mcp, address, network);
      } catch (mcpError: any) {
        console.error('getAddressAssetFlow MCP fallback error:', mcpError.message);
        return {
          address,
          network,
          flows: [],
          error: combineErrors(error, mcpError),
        };
      }
    }

    console.error('getAddressAssetFlow error:', error.message);
    return {
      address,
      network,
      flows: [],
      error: error.message,
    };
  }
}

export async function getAddressBalance(address: string, network: string) {
  try {
    const rest = await callRangeAPI('/v1/data/address/balance', { address, network });
    return normalizeBalanceResponse(rest, address, network);
  } catch (error: any) {
    if (shouldUseMCPFallback(error)) {
      try {
        const mcp = await callMCPTool('get_address_balance', { address, network });
        return normalizeBalanceResponse(mcp, address, network);
      } catch (mcpError: any) {
        console.error('getAddressBalance MCP fallback error:', mcpError.message);
        return {
          address,
          network,
          balances: [],
          error: combineErrors(error, mcpError),
        };
      }
    }

    console.error('getAddressBalance error:', error.message);
    return {
      address,
      network,
      balances: [],
      error: error.message,
    };
  }
}

export async function getAddressFeatures(address: string, network: string) {
  try {
    return await callRangeAPI('/v1/data/address/features', { address, network });
  } catch (error: any) {
    if (shouldUseMCPFallback(error)) {
      try {
        return await callMCPTool('get_address_features', { address, network });
      } catch (mcpError: any) {
        console.error('getAddressFeatures MCP fallback error:', mcpError.message);
        return {
          address,
          network,
          error: combineErrors(error, mcpError),
        };
      }
    }

    console.error('getAddressFeatures error:', error.message);
    return {
      address,
      network,
      error: error.message,
    };
  }
}

export async function getTransfers(
  address: string,
  network?: string,
  size: number = 10
) {
  try {
    const rest = await callRangeAPI('/v1/data/address/transfers', { address, network, size });
    return normalizeTransfersResponse(rest, address);
  } catch (error: any) {
    if (shouldUseMCPFallback(error)) {
      try {
        const mcp = await callMCPTool('get_transfers', { address, network, size });
        return normalizeTransfersResponse(mcp, address);
      } catch (mcpError: any) {
        console.error('getTransfers MCP fallback error:', mcpError.message);
        return {
          address,
          transfers: [],
          error: combineErrors(error, mcpError),
        };
      }
    }

    console.error('getTransfers error:', error.message);
    return {
      address,
      transfers: [],
      error: error.message,
    };
  }
}

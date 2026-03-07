// Range API Wrapper using MCP HTTP endpoint
import { GUARDRAILS } from './constants';

const RANGE_MCP_URL = 'https://api.range.org/ai/mcp';
const API_KEY = process.env.RANGE_API_KEY;

if (!API_KEY) {
  console.warn('RANGE_API_KEY not set in environment variables');
}

// Track API call budget
let callCount = 0;

export function resetCallCount() {
  callCount = 0;
}

export function getCallCount() {
  return callCount;
}

// Generic MCP tool call
async function callMCPTool(toolName: string, params: Record<string, any>) {
  if (callCount >= GUARDRAILS.MAX_API_CALLS_PER_RUN) {
    throw new Error(`API budget exceeded (${GUARDRAILS.MAX_API_CALLS_PER_RUN} calls max)`);
  }

  callCount++;

  const response = await fetch(RANGE_MCP_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: callCount,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Range API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`MCP tool error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  return data.result;
}

// Risk & Sanctions
export async function getAddressRisk(address: string, network?: string) {
  try {
    return await callMCPTool('get_address_risk', { address, network });
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
    return await callMCPTool('check_sanctions', {
      address,
      network,
      include_details: includeDetails,
    });
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
    return await callMCPTool('get_address_info', { address, network });
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
    return await callMCPTool('get_address_connections', {
      address,
      network,
      size,
    });
  } catch (error: any) {
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
    return await callMCPTool('get_address_funded_by', { address, network });
  } catch (error: any) {
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
    return await callMCPTool('get_address_asset_flow', {
      address,
      network,
      network_type: undefined,
    });
  } catch (error: any) {
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
    return await callMCPTool('get_address_balance', {
      address,
      network,
    });
  } catch (error: any) {
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
    return await callMCPTool('get_address_features', { address, network });
  } catch (error: any) {
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
    return await callMCPTool('get_transfers', {
      address,
      network,
      size,
    });
  } catch (error: any) {
    console.error('getTransfers error:', error.message);
    return {
      address,
      transfers: [],
      error: error.message,
    };
  }
}

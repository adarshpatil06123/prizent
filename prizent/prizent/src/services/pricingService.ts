import axios from 'axios';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type PricingMode = 'SELLING_PRICE' | 'PROFIT_PERCENT';

export interface PricingCalcRequest {
  /** product ID (skuId in backend) */
  skuId: number;
  marketplaceId: number;
  mode: PricingMode;
  /** selling price when mode = SELLING_PRICE, or desired profit % when mode = PROFIT_PERCENT */
  value: number;
}

export interface PricingCalcResponse {
  productId: number;
  productName: string;
  skuCode: string;
  productCost: number;
  marketplaceId: number;
  marketplaceName: string;
  sellingPrice: number;
  commission: number;
  shipping: number;
  marketing: number;
  netRealisation: number;
  profit: number;
  profitPercentage: number;
}

export interface PricingVersionDto {
  id: number;
  skuId: number;
  marketplaceId: number;
  sellingPrice: number;
  profitPercentage: number;
  effectiveFrom: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  /** e.g. "Scheduled for activation at 2026-02-24 00:00" */
  activationMessage: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

const BASE_URL = '/api/pricing';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Calls POST /api/pricing/calculate and returns the full pricing breakdown.
 */
export const calculatePricing = async (
  req: PricingCalcRequest
): Promise<PricingCalcResponse> => {
  const response = await axios.post<PricingCalcResponse>(
    `${BASE_URL}/calculate`,
    req,
    { headers: authHeaders() }
  );
  return response.data;
};

/**
 * Calls POST /api/pricing/save — re-calculates server-side and persists a
 * SCHEDULED version that activates at next midnight.
 */
export const savePricing = async (
  req: PricingCalcRequest
): Promise<PricingVersionDto> => {
  const response = await axios.post<PricingVersionDto>(
    `${BASE_URL}/save`,
    req,
    { headers: authHeaders() }
  );
  return response.data;
};

/**
 * Calls GET /api/pricing/active?skuId=&marketplaceId= and returns the
 * currently ACTIVE pricing version.
 */
export const getActivePricing = async (
  skuId: number,
  marketplaceId: number
): Promise<PricingVersionDto> => {
  const response = await axios.get<PricingVersionDto>(
    `${BASE_URL}/active`,
    {
      params: { skuId, marketplaceId },
      headers: authHeaders(),
    }
  );
  return response.data;
};

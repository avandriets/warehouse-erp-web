export interface CounterpartyCreate {
  code: string;
  name: string;
  active: boolean;
  tax_identifier: string | null;
  registration_identifier: string | null;
  legal_address: string | null;
  postal_address: string | null;
  contact_details: string | null;
  payment_details: string | null;
  is_supplier: boolean;
  is_customer: boolean;
  is_other_recipient: boolean;
}

export interface Counterparty extends CounterpartyCreate {
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CounterpartiesPage {
  items: Counterparty[];
  total: number;
}

export type CounterpartyUpdate = Partial<Omit<CounterpartyCreate, 'code'>>;

export interface CounterpartiesQuery {
  q?: string;
  active?: boolean;
  limit: number;
  offset: number;
}

export interface CounterpartyMatch {
  id: string;
  code: string;
  name: string;
}

export interface CounterpartyDuplicateCheck {
  matches: CounterpartyMatch[];
}

export function normalizeCounterparty<T extends Partial<CounterpartyCreate>>(payload: T): T {
  return {
    ...payload,
    ...(payload.code === undefined ? {} : { code: payload.code.trim() }),
    ...(payload.name === undefined ? {} : { name: payload.name.trim() }),
    ...Object.fromEntries(
      (
        [
          'tax_identifier',
          'registration_identifier',
          'legal_address',
          'postal_address',
          'contact_details',
          'payment_details',
        ] as const
      )
        .filter(key => payload[key] !== undefined)
        .map(key => [key, payload[key]?.trim() || null]),
    ),
  };
}

export type InitializeTransactionPayload = {
  amount: string;
  phone_number: string;
  currency?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  tx_ref?: string;
  callback_url?: string;
  return_url?: string;
  'customization[title]'?: string;
  'customization[description]'?: string;
  'meta[hide_receipt]'?: string;
  'meta[invoices]'?: string;
};

export interface ChapaInitiateResponse {
  message: string;
  status: string;
  txReference: string;
  data: ChapaData | null;
}

export interface ChapaPaymentDetailsResponse {
  message: string;
  status: string;
  txRefernce: string;
  data: ChapaPaymentDetails | null;
}

export interface ChapaData {
  checkout_url: string;
}

export interface ChapaPaymentDetails {
  first_name: string;
  last_name: string;
  email: string;
  currency: string;
  amount: number;
  charge: number;
  mode: string;
  method: string;
  type: string;
  status: string;
  reference: string;
  tx_ref: string;
  customization: {
    title: string;
    description: string;
    logo: string | null;
  };
  meta: any | null;
  created_at: string;
  updated_at: string;
}

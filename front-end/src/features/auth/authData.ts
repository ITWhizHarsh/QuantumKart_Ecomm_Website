export type AuthData = {
  logged_in: boolean,
  id: number | null,
  email_address: string | null,
  auth_method: string | null,
  customer_name?: string | null,
  customer_age?: number | null,
  loyalty_pts?: number | null,
  company_name?: string | null,
  agent_name?: string | null,
  no_of_products?: number | null
}
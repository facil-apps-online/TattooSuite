import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

// Interface for a Tenant, from the perspective of a tenant user.
// It does not include platform information or system owner status.
export interface Tenant {
  id: string;
  name: string;
  subscription_status: string;
  default_language_code?: string | null;
  default_currency_id?: string | null;
  default_timezone?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  country_id?: string | null;
  logo_url?: string | null;
  legal_name?: string | null;
  tax_id?: string | null;
  billing_address?: string | null;
  website?: string | null;
  whatsapp_phone?: string | null;
  commercial_email?: string | null;
  einvoicing_email?: string | null;
  physical_address_line1?: string | null;
  physical_address_line2?: string | null;
  physical_city?: string | null;
  physical_state?: string | null;
  physical_postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  countries?: { name: string; iso_code: string } | null;
  slug?: string | null;
}

// --- React Query Hooks for Tenant Users ---

// GET the current user's tenant data
const fetchTenantById = async (tenantId: string, platformId: string): Promise<Tenant> => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/tenant-actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
    body: JSON.stringify({
      action: 'get-tenant-details',
      payload: { tenantId, platformId },
    }),
  });

  const { data, error } = await response.json();

  if (error) {
    throw new Error(error.message);
  }
  return data.tenant as Tenant;
};

export const useTenantById = (tenantId: string) => {
  const { currentAssignment } = useAuth();
  const platformId = currentAssignment?.platform_id;

  return useQuery<Tenant, Error>({
    queryKey: ['tenant', tenantId, platformId],
    queryFn: () => fetchTenantById(tenantId!, platformId!),
    enabled: !!tenantId && !!platformId, // Only run the query if tenantId and platformId are available
  });
};

// UPDATE the current user's tenant data
const updateTenant = async ({ id, platformId, ...values }: Partial<Tenant> & { id: string; platformId: string }): Promise<Tenant> => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/tenant-actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
    body: JSON.stringify({
      action: 'update_tenant',
      payload: { id, platformId, values },
    }),
  });

  const { data, error } = await response.json();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};
  
export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  const { tenantId, currentAssignment } = useAuth();
  const platformId = currentAssignment?.platform_id;

  return useMutation<Tenant, Error, Partial<Tenant> & { id: string; platformId: string }>({
    mutationFn: updateTenant,
    onSuccess: (data) => {
      // Invalidate the query for the current tenant to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId, platformId] });
    },
  });
};

export const useUpdateTenantSlug = () => {
  const queryClient = useQueryClient();
  const { tenantId, session } = useAuth();

  return useMutation({
    mutationFn: async ({ slug }: { slug: string }) => {
      if (!tenantId || !session) throw new Error("User not authenticated or tenant not found.");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/tenant-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'update_tenant_slug',
          payload: { slug },
        }),
      });

      // The RPC returns no data on success, so we just check the status
      if (!response.ok) {
        const json = await response.json();
        if (json.error?.includes('slug_already_taken')) {
          throw new Error('Este alias (slug) ya está en uso. Por favor, elige otro.');
        }
        if (json.error?.includes('invalid_slug_format')) {
          throw new Error('El alias (slug) tiene un formato inválido. Usa solo letras minúsculas, números y guiones.');
        }
        throw new Error(json.error || 'Failed to update slug');
      }
      return response.status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant_settings', tenantId] }); 
    },
  });
};

export const useCheckSlugAvailability = (slug: string, countryId: string, platformId: string) => {
  return useQuery<boolean, Error>({
    queryKey: ['slugAvailability', slug, countryId, platformId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/tenant-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'check_slug_availability',
          payload: { slug, countryId, platformId },
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to check slug availability');
      }
      return json;
    },
    enabled: !!slug && !!countryId && !!platformId && slug.length > 2,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

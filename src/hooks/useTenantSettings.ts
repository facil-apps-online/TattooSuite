import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export interface TenantSettingsData {
  logo_url?: string | null;
}

// GET tenant-specific settings
const fetchTenantSettings = async (tenantId: string, platformId: string): Promise<TenantSettingsData> => {
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

  // Corrected extraction: data.tenant because get-tenant-details returns an object with tenant and other details.
  return { logo_url: data.tenant.logo_url };
};

export const useTenantSettings = () => {
  const { tenantId, currentAssignment } = useAuth();
  const platformId = currentAssignment?.platform_id;

  const queryResult = useQuery<TenantSettingsData, Error>({
    queryKey: ['tenant_settings', tenantId, platformId],
    queryFn: () => {
      if (!tenantId || !platformId) throw new Error("Tenant ID or Platform ID is required to fetch tenant settings.");
      return fetchTenantSettings(tenantId, platformId);
    },
    enabled: !!tenantId && !!platformId,
  });

  return queryResult;
};

// UPDATE tenant-specific settings
export const useUpdateTenantSettings = () => {
  const queryClient = useQueryClient();
  const { tenantId, currentAssignment } = useAuth();
  const platformId = currentAssignment?.platform_id;

  return useMutation<any, Error, Partial<TenantSettingsData>>({
    mutationFn: async (settings) => {
      if (!tenantId || !platformId) throw new Error("Tenant ID or Platform ID is required to update tenant settings.");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/tenant-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'update_tenant',
          payload: { id: tenantId, platformId, values: settings }
        }),
      });

      const invokeData = await response.json();
      if (!response.ok) {
        throw new Error(invokeData.message || 'Failed to update tenant settings.');
      }

      // If an old logo was replaced, delete it from Google Drive
      if (invokeData.deletedFileId) {
        const { error: deleteError } = await supabase.functions.invoke('google-drive-delete', {
          body: {
            fileId: invokeData.deletedFileId,
            tenantId: tenantId,
          }
        });
        if (deleteError) {
          console.error('Error deleting old logo from Google Drive:', deleteError.message);
        }
      }

      return invokeData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_settings', tenantId, platformId] });
    },
  });
};

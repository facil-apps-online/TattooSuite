import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export interface TenantSettingsData {
  logo_url?: string | null;
}

// GET tenant-specific settings
const fetchTenantSettings = async (tenantId: string, platformId: string): Promise<TenantSettingsData> => {
  console.log('fetchTenantSettings: Attempting to fetch via tenant-actions for tenantId:', tenantId, 'platformId:', platformId);
  const response = await fetch('/functions/v1/tenant-actions', {
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
    console.log('fetchTenantSettings: Error fetching via tenant-actions for tenantId:', tenantId, 'platformId:', platformId, 'Error:', error);
    throw new Error(error.message);
  }
  
  console.log('fetchTenantSettings: Successfully fetched via tenant-actions for tenantId:', tenantId, 'platformId:', platformId, 'Data:', data);
  // Corrected extraction: data.tenant because get-tenant-details returns an object with tenant and other details.
  return { logo_url: data.tenant.logo_url };
};

export const useTenantSettings = () => {
  const { tenantId, currentAssignment } = useAuth(); // Get currentAssignment
  const platformId = currentAssignment?.platform_id; // Get platformId

  const queryResult = useQuery<TenantSettingsData, Error>({
    queryKey: ['tenant_settings', tenantId, platformId], // Add platformId to queryKey
    queryFn: () => {
      if (!tenantId || !platformId) throw new Error("Tenant ID or Platform ID is required to fetch tenant settings."); // Add platformId check
      return fetchTenantSettings(tenantId, platformId);
    },
    enabled: !!tenantId && !!platformId, // Enable only if tenantId and platformId are available
  });

  console.log('useTenantSettings: queryResult data:', queryResult.data, 'isLoading:', queryResult.isLoading, 'isFetching:', queryResult.isFetching);
  return queryResult;
};

// UPDATE tenant-specific settings
export const useUpdateTenantSettings = () => {
  const queryClient = useQueryClient();
  const { tenantId, currentAssignment } = useAuth(); // Get currentAssignment
  const platformId = currentAssignment?.platform_id; // Get platformId

  return useMutation<any, Error, Partial<TenantSettingsData>>({
    mutationFn: async (settings) => {
      if (!tenantId || !platformId) throw new Error("Tenant ID or Platform ID is required to update tenant settings."); // Add platformId check
      
      console.log("useUpdateTenantSettings: mutationFn called with settings:", settings);

      const response = await fetch('/functions/v1/tenant-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'update_tenant',
          payload: { id: tenantId, platformId, values: settings } // Pass platformId
        }),
      });

      const invokeData = await response.json();
      if (!response.ok) {
        throw new Error(invokeData.message || 'Failed to update tenant settings.');
      }

      // If an old logo was replaced, delete it from Google Drive
      if (invokeData.deletedFileId) { // Changed oldLogoFileId to deletedFileId
        console.log(`Deleting old logo file: ${invokeData.deletedFileId}`);
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
      console.log('useUpdateTenantSettings: Invalidate queries for tenantId:', tenantId, 'platformId:', platformId); // Add platformId
      queryClient.invalidateQueries({ queryKey: ['tenant_settings', tenantId, platformId] }); // Add platformId
    },
  });
};

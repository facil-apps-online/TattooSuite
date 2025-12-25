import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTenantAction } from "@/lib/fetchTenantAction";
import { supabase } from "@/lib/supabaseClient";

// --- INTERFACES ---

export interface ProjectSessionItem {
  id?: string;
  product_id: string | null;
  service_id: string | null;
  quantity: number;
  notes?: string;
}

export interface ProjectSession {
  id?: string;
  session_number: number;
  name: string;
  description?: string;
  items: ProjectSessionItem[];
  payment_percentage?: number | null;
  fixed_payment_amount?: number | null;
}

export interface ProjectImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProjectCategory {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: 'treatment' | 'project';
  upfront_price?: number;
  financed_price?: number;
  is_active: boolean;
  session_count?: number; 
  sessions?: ProjectSession[];
  cover_image_url?: string;
  categories?: ProjectCategory[];
  project_images?: ProjectImage[];
  created_at: string;
  tenant_id: string;
}

export interface ClientProject {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'cancelled';
  start_date: string;
  progress: {
    completed: number;
    total: number;
  };
  has_scheduled_sessions: boolean;
}

export interface ClientProjectSession {
    id: string;
    client_treatment_id: string;
    session_number: number;
    name: string;
    description: string;
    status: 'pending' | 'completed' | 'Cita Asignada' | 'Cancelada';
    completed_at: string | null;
    attention_id: string | null;
    attention_datetime: string | null;
    payment_due: {
        amount: number | null;
        percentage: number | null;
        status: 'pending' | 'paid';
    } | null;
}

export interface ClientProjectDetails extends ClientProject {
    sessions: ClientProjectSession[];
    final_price: number;
    payment_type: 'upfront' | 'financed';
}

// --- HOOKS ---

export const useProjects = (tenantId: string, type: 'treatment' | 'project', categoryId?: string, showInactive?: boolean) => {
  return useQuery<Project[], Error>({
    queryKey: ['projects', tenantId, type, categoryId, showInactive],
    queryFn: async () => {
      const result = await fetchTenantAction('list_treatments', { tenant_id: tenantId, type: type, category_id: categoryId, show_inactive: showInactive });
      return result.data || [];
    },
    enabled: !!tenantId,
  });
};

export const useClientProjects = (clientId: string) => {
  return useQuery<ClientProject[], Error>({
    queryKey: ['client_projects', clientId],
    queryFn: async () => {
      const result = await fetchTenantAction('get_client_treatments', { client_id: clientId });
      return result.data || [];
    },
    enabled: !!clientId,
  });
};

export const useProjectDetails = (projectId: string) => {
  return useQuery<Project, Error>({
    queryKey: ['project_details', projectId],
    queryFn: async () => {
      const result = await fetchTenantAction('get_treatment_details', { treatment_id: projectId });
      return result.data?.[0] || null;
    },
    enabled: !!projectId,
  });
};

export const useClientProjectDetails = (clientProjectId: string) => {
  return useQuery<ClientProjectDetails, Error>({
    queryKey: ['client_project_details', clientProjectId],
    queryFn: async () => {
      const result = await fetchTenantAction('get_client_treatment_details', { client_treatment_id: clientProjectId });
      return result.data;
    },
    enabled: !!clientProjectId,
  });
};


// --- IMAGE HOOKS (adapted for Projects) ---

export const useProjectImages = (projectId: string) => {
  return useQuery<ProjectImage[], Error>({
    queryKey: ["projectImages", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return fetchTenantAction("get_treatment_images", { treatmentId: projectId });
    },
    enabled: !!projectId,
  });
};

export const useDeleteProjectImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation<void, Error, { imageId: string; projectId: string }>({
    mutationFn: ({ imageId }) => fetchTenantAction("delete_treatment_image", { imageId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectImages", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Éxito", description: "Imagen eliminada correctamente.", variant: "success" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `No se pudo eliminar la imagen: ${error.message}`, variant: "destructive" });
    },
  });
};

export const useSetPrimaryProjectImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation<void, Error, { projectId: string; imageId: string }>({
    mutationFn: (variables) => fetchTenantAction("set_primary_treatment_image", { treatmentId: variables.projectId, imageId: variables.imageId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectImages", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Éxito", description: "Imagen principal actualizada.", variant: "success" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `No se pudo actualizar la imagen principal: ${error.message}`, variant: "destructive" });
    },
  });
};

export const useUploadProjectImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentAssignment } = useAuth();

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  return useMutation<any, Error, { projectId: string; file: File }>({
    mutationFn: async ({ projectId, file }) => {
      if (!currentAssignment?.tenant_id) throw new Error("No se pudo determinar el tenant actual.");
      const fileBase64 = await convertFileToBase64(file);
      const { data, error } = await supabase.from('treatment_images').insert({
        tenant_id: currentAssignment.tenant_id,
        treatment_id: projectId,
        image_url: file.name, // Assuming image_url will be set by the google-drive-upload function
        is_primary: false, // Default to false
        sort_order: 0, // Default to 0
      }).select().single();
      if (error) throw new Error(error.message);
      // Update the image_url with the actual URL from the google-drive-upload response
      if (data && uploadResult.fileId) {
        await supabase.from('treatment_images').update({ image_url: uploadResult.fileId }).eq('id', data.id);
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectImages", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Éxito", description: "Imagen subida y asociada correctamente.", variant: "success" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Error al subir la imagen: ${error.message}`, variant: "destructive" });
    },
  });
};

export const useUpdateProjectImagesOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation<void, Error, { projectId: string; images_data: { id: string; sort_order: number }[] }>({
    mutationFn: (variables) => fetchTenantAction("update_treatment_images_order", { treatmentId: variables.projectId, images_data: variables.images_data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectImages", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Éxito", description: "Orden de imágenes actualizado.", variant: "success" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `No se pudo reordenar las imágenes: ${error.message}`, variant: "destructive" });
    },
  });
};

// --- MUTATIONS ---

export const useAssignProjectToClient = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { tenantId } = useAuth();
    return useMutation({
        mutationFn: (payload: { client_id: string; treatment_id: string; name: string; payment_type: 'upfront' | 'financed'; final_price: number; start_date: string; sessions: ProjectSession[]; }) => {
            const fullPayload = { ...payload, tenant_id: tenantId };
            return fetchTenantAction('assign_treatment_to_client', fullPayload);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['client_projects', variables.client_id] });
            toast({ title: "Proyecto Asignado", description: "El proyecto y sus sesiones han sido asignados al cliente.", variant: "success" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: `Hubo un problema al asignar el proyecto: ${error.message}`, variant: "destructive" });
        },
    });
}

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();
  return useMutation({
    mutationFn: (projectData: Omit<Project, 'id' | 'created_at' | 'business_id'>) => fetchTenantAction('create_treatment', { ...projectData, tenant_id: tenantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Proyecto Creado", description: "El nuevo proyecto ha sido creado.", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Project, 'id' | 'created_at' | 'business_id'>> }) => fetchTenantAction('update_treatment', { treatment_id: id, tenant_id: tenantId, ...updates }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project_details', variables.id] });
      toast({ title: "Proyecto Actualizado", description: "El proyecto ha sido actualizado.", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();
  return useMutation({
    mutationFn: (id: string) => fetchTenantAction('delete_treatment', { treatment_id: id, tenant_id: tenantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Proyecto Eliminado", description: "El proyecto ha sido eliminado.", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteClientProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();
  return useMutation({
    mutationFn: ({ client_treatment_id, client_id }: { client_treatment_id: string; client_id: string; }) => {
        if (!tenantId) {
            throw new Error("Tenant ID not found");
        }
        return fetchTenantAction('delete_client_treatment', { 
            p_client_treatment_id: client_treatment_id,
            p_tenant_id: tenantId 
        });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client_treatments', variables.client_id] });
      toast({ title: "Éxito", description: "El proyecto asignado ha sido eliminado.", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `No se pudo eliminar el proyecto: ${error.message}`, variant: "destructive" });
    },
  });
};

export const useCancelProjectSession = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (sessionId: string) => fetchTenantAction('cancel_treatment_session', { p_session_id: sessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_project_details'] });
      queryClient.invalidateQueries({ queryKey: ['client_projects'] });
      toast({ title: "Sesión Cancelada", description: "La sesión ha sido marcada como cancelada.", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `No se pudo cancelar la sesión: ${error.message}`, variant: "destructive" });
    },
  });
};

export const useReactivateProjectSession = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (sessionId: string) => fetchTenantAction('reactivate_treatment_session', { p_session_id: sessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_project_details'] });
      queryClient.invalidateQueries({ queryKey: ['client_projects'] });
      toast({ title: "Sesión Reactivada", description: "La sesión ahora está pendiente y puede ser asignada.", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `No se pudo reactivar la sesión: ${error.message}`, variant: "destructive" });
    },
  });
};

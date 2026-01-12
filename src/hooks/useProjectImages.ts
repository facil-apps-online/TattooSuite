import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTenantAction } from "@/lib/fetchTenantAction";
import { useToast } from "@/hooks/use-toast";
import { useGoogleDriveStorage } from "./useGoogleDriveStorage";
import { useAuth } from "@/contexts/AuthContext";

export interface ProjectImage {
  id: string;
  project_id: string;
  tenant_id: string;
  image_url: string | null;
  google_drive_file_id: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Hook to get images for a specific project
export const useProjectImages = (projectId: string) => {
  return useQuery<ProjectImage[], Error>({
    queryKey: ["projectImages", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return fetchTenantAction("get_project_images", { projectId });
    },
    enabled: !!projectId,
  });
};

// Hook to associate a file uploaded to GDrive with a project
export const useAssociateProjectImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<any, Error, { projectId: string; google_drive_file_id: string }>({
    mutationFn: (variables) => fetchTenantAction("associate_project_image", variables),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectImages", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['master_projects'] });
    },
    onError: (error) => {
      toast({ title: "Error de Asociación", description: `La imagen se subió pero no se pudo asociar al proyecto: ${error.message}`, variant: "destructive" });
    },
  });
};

// Hook to delete an image from a project
export const useDeleteProjectImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { deleteFile: deleteFromDrive } = useGoogleDriveStorage();

  const { mutate, isPending: isDeleting } = useMutation<void, Error, { imageId: string; projectId: string; google_drive_file_id: string }>({
    mutationFn: async ({ imageId, projectId, google_drive_file_id }) => {
      // 1. Delete from our database first
      await fetchTenantAction("delete_project_image", { imageId });

      // 2. Immediately invalidate queries to update the UI instantly
      queryClient.invalidateQueries({ queryKey: ["projectImages", projectId] });
      queryClient.invalidateQueries({ queryKey: ['master_projects'] });
      
      // 3. Then, delete from Google Drive in the background
      try {
        await deleteFromDrive(google_drive_file_id);
      } catch (error) {
        console.error(`DB record deleted. Error deleting file from Google Drive: ${(error as Error).message}.`);
      }
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Imagen eliminada.", variant: "success" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `No se pudo eliminar el registro de la imagen: ${error.message}`, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["projectImages"] });
      queryClient.invalidateQueries({ queryKey: ['master_projects'] });
    },
  });

  return { mutate, isDeleting };
};

// Hook to set an image as the primary one for a project
export const useSetPrimaryProjectImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, { projectId: string; imageId: string }>({
    mutationFn: (variables) => fetchTenantAction("set_primary_project_image", variables),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectImages", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['master_projects'] });
      toast({ title: "Éxito", description: "Imagen principal actualizada.", variant: "success" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `No se pudo actualizar la imagen principal: ${error.message}`, variant: "destructive" });
    },
  });
};

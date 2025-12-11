import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectDetails, useUpdateProject, Project } from '@/hooks/useProjects';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatterBox } from '@/components/ChatterBox';
import { ProjectImageGallery } from '@/components/projects/ProjectImageGallery';
import { ManageProjectImagesDialog } from '@/components/projects/ManageProjectImagesDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { fetchTenantAction } from '@/lib/fetchTenantAction';
import { useToast } from '@/hooks/use-toast';

const EditProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) {
      return <div>ID de proyecto no proporcionado.</div>;
  }
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");

  const { data: project, isLoading: isLoadingProject, refetch } = useProjectDetails(projectId);
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();

  const handleCategoryUpdates = async (newCategoryIds: string[]) => {
    const originalCategoryIds = (project?.categories || [])
      .map(c => c.treatment_categories?.id)
      .filter((id): id is string => !!id)
      .sort();
    const sortedNewCategoryIds = [...newCategoryIds].sort();

    if (JSON.stringify(originalCategoryIds) !== JSON.stringify(sortedNewCategoryIds)) {
        try {
            await fetchTenantAction('update_treatment_category_assignments', {
              treatment_id: projectId,
              category_ids: newCategoryIds,
            });
            refetch();
        } catch (error: any) {
            toast({ title: "Error", description: `Error al actualizar categorías: ${error.message}`, variant: "destructive" });
        }
    }
  }

  const handleSave = (data: any, categoryIds: string[]) => {
    updateProject({ id: projectId, updates: data }, {
      onSuccess: () => {
        handleCategoryUpdates(categoryIds);
      }
    });
  };

  if (isLoadingProject) {
    return (
        <div className="space-y-8">
            <Skeleton className="h-10 w-1/3" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-96 w-full" />
                </div>
                <div>
                    <Skeleton className="h-screen w-full" />
                </div>
            </div>
        </div>
    );
  }

  if (!project) {
    return <div>Proyecto no encontrado.</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title={project.name}
        subtitle="Gestiona todos los aspectos del proyecto."
        backButton={
          <Button variant="outline" size="icon" onClick={() => navigate('/app/projects')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <Tabs defaultValue="details" onValueChange={setActiveTab} value={activeTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Detalles</TabsTrigger>
                <TabsTrigger value="images">Imágenes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <Card>
                  <CardHeader><CardTitle>Detalles del Proyecto</CardTitle></CardHeader>
                  <CardContent>
                    <ProjectForm
                        project={project}
                        onSave={handleSave}
                        isSaving={isUpdating}
                        submitButtonText="Guardar Proyecto"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="images">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Imágenes del Proyecto</CardTitle>
                    <ManageProjectImagesDialog
                      projectId={project.id}
                      projectName={project.name}
                      trigger={<Button variant="outline">Gestionar Imágenes</Button>}
                    />
                  </CardHeader>
                  <CardContent>
                    <ProjectImageGallery projectId={project.id} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
        </div>
        <div>
          <ChatterBox resourceType="treatments" resourceId={project.id} tenantId={project.tenant_id} containerClassName="h-[calc(100vh-22rem)]" />
        </div>
      </div>
    </div>
  );
};

export default EditProjectPage;

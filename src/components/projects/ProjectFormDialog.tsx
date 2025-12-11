import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { useCreateProject, useUpdateProject, Project } from '@/hooks/useProjects';
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProjectFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  project?: Project;
}

export const ProjectFormDialog = ({ isOpen, onOpenChange, onSuccess, project }: ProjectFormDialogProps) => {
  const { toast } = useToast();
  const isEditMode = !!project;

  const { mutate: createProject, isPending: isCreating } = useCreateProject();
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (isEditMode) {
      form.reset({
        name: project.name,
        description: project.description || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [project, isEditMode, form]);

  const onSubmit = (data: FormData) => {
    const mutationOptions = {
      onSuccess: () => {
        toast({ title: "Éxito", description: `Proyecto ${isEditMode ? 'actualizado' : 'creado'} correctamente.`, variant: "success" });
        onSuccess();
      },
      onError: (error: any) => {
        toast({ title: "Error", description: `No se pudo ${isEditMode ? 'actualizar' : 'crear'} el proyecto: ${error.message}`, variant: "destructive" });
      },
    };

    if (isEditMode) {
      updateProject({ id: project.id, updates: data }, mutationOptions);
    } else {
      createProject({ ...data, type: 'project' }, mutationOptions);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edición Rápida" : "Crear Nuevo"} Proyecto</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles básicos de tu proyecto." : "Añade un nuevo proyecto. Podrás configurar los precios y sesiones en la edición completa."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Proyecto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Manga completa en neotradicional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Breve descripción del proyecto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                    {isCreating || isUpdating ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

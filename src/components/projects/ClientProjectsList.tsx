import React from 'react';
import { useClientProjects, useClientProjectDetails, ClientProject, useDeleteClientProject } from '@/hooks/useProjects';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePriceFormat } from '@/hooks/usePriceFormat';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ProjectDetailContent = ({ clientProjectId }: { clientProjectId: string }) => {
    const { data: details, isLoading, error } = useClientProjectDetails(clientProjectId);
    const { formatPrice } = usePriceFormat();

    if (isLoading) return <div className="p-4"><p>Cargando detalles...</p></div>;
    if (error) return <div className="p-4 text-red-500"><p>Error: {error.message}</p></div>;
    if (!details) return null;

    return (
        <div className="pl-4 space-y-3">
            {details.sessions.map((session, index) => (
                <div key={session.id} className="flex items-start justify-between border-t py-3">
                    <div className="flex items-start gap-3">
                        {session.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-1" />
                        ) : (
                            <Circle className="h-5 w-5 text-gray-400 mt-1" />
                        )}
                        <div>
                            <p className="font-semibold">{index + 1}. {session.name}</p>
                            <p className="text-sm text-muted-foreground">{session.description}</p>
                        </div>
                    </div>
                    {session.payment_due && (
                        <div className="text-right pr-4"> 
                            <p className="font-semibold">{formatPrice(session.payment_due.amount)}</p>
                            <Badge variant={session.payment_due.status === 'paid' ? 'success' : 'destructive'}>
                                {session.payment_due.status === 'paid' ? 'Pagado' : 'Pendiente'}
                            </Badge>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export const ClientProjectsList = ({ clientId }: { clientId: string }) => {
    const { data: projects, isLoading, error } = useClientProjects(clientId);
    const { mutate: deleteProject, isPending: isDeleting } = useDeleteClientProject();

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
            </div>
        );
    }
    
    if (error) {
        return <p className="text-red-500">Error al cargar los proyectos: {error.message}</p>;
    }

    if (!projects || projects.length === 0) {
        return <p className="text-sm text-slate-500">Este cliente no tiene proyectos asignados.</p>;
    }

    return (
        <Accordion type="single" collapsible className="w-full space-y-4">
            {projects.map((project) => (
                <Card key={project.id}>
                    <AccordionItem value={project.id} className="border-b-0">
                        <AccordionTrigger className="p-6">
                            <div className="flex justify-between items-center w-full">
                                <div className="text-left">
                                    <p className="font-bold text-lg">{project.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Progreso: {project.progress.completed} de {project.progress.total} sesiones
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant={project.status === 'completed' ? 'success' : 'default'} className="capitalize">
                                        {project.status}
                                    </Badge>
                                    {project.progress.completed === 0 && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => e.stopPropagation()} // Prevent accordion from toggling
                                                    disabled={isDeleting}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción no se puede deshacer. Se eliminará permanentemente el proyecto asignado y todos sus datos.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteProject({ client_project_id: project.id, client_id: clientId })}
                                                        disabled={isDeleting}
                                                    >
                                                        Eliminar
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <ProjectDetailContent clientProjectId={project.id} />
                        </AccordionContent>
                    </AccordionItem>
                </Card>
            ))}
        </Accordion>
    );
};

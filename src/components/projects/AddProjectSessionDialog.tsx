import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClientProjects, useClientProjectDetails } from '@/hooks/useProjects';
import { PlusCircle } from 'lucide-react';
import { usePriceFormat } from '@/hooks/usePriceFormat';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface AddProjectSessionDialogProps {
  children: React.ReactNode;
  clientId: string;
  onSessionSelected: (session: any) => void;
}

export function AddProjectSessionDialog({ children, clientId, onSessionSelected }: AddProjectSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { formatPrice } = usePriceFormat();

  const { data: clientProjects, isLoading: isLoadingClientProjects } = useClientProjects(clientId);
  const { data: projectDetails, isLoading: isLoadingProjectDetails } = useClientProjectDetails(selectedProjectId || '');

  const handleSelectSession = (session: any) => {
    onSessionSelected(session);
    setOpen(false);
  };

  const renderSessionStatusBadge = (status: string) => {
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' = 'outline';
    let text = '';
    switch (status) {
        case 'pending':
            variant = 'outline';
            text = 'Pendiente';
            break;
        case 'Cita Asignada':
            variant = 'default';
            text = 'Agendada';
            break;
        case 'Cancelada':
            variant = 'destructive';
            text = 'Cancelada';
            break;
        case 'completed':
            variant = 'success';
            text = 'Finalizada';
            break;
        default:
            return null; // No mostrar nada si el estado es desconocido
    }
    return <Badge variant={variant}>{text}</Badge>;
  };

  const getDisabledButtonText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Finalizada';
      case 'Cita Asignada':
        return 'Agendada';
      case 'Cancelada':
        return 'Cancelada';
      default:
        return 'No disponible';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir Sesión de Proyecto</DialogTitle>
          <DialogDescription>
            Selecciona un proyecto y la sesión pendiente que deseas añadir a la atención actual.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Proyecto del Cliente</Label>
            <Select onValueChange={setSelectedProjectId} value={selectedProjectId || ''} disabled={isLoadingClientProjects || !clientProjects || clientProjects.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un proyecto asignado..." />
              </SelectTrigger>
              <SelectContent>
                {clientProjects?.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} ({project.progress.completed}/{project.progress.total} con actividad)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProjectId && isLoadingProjectDetails && <p>Cargando detalles del proyecto...</p>}

          {projectDetails && (
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Sesiones del Proyecto:</h4>
              {projectDetails.sessions.length === 0 ? (
                <p className="text-muted-foreground">No hay sesiones definidas para este proyecto.</p>
              ) : (
                <ul className="space-y-2">
                  {projectDetails.sessions.map((session, index) => (
                      <li key={session.id} className="flex items-center justify-between p-3 border rounded-md">
                        {/* Contenedor Izquierdo (Info) */}
                        <div className="flex-grow pr-4">
                          <p className="font-medium">Sesión {session.session_number}: {session.name}</p>
                          <p className="text-sm text-muted-foreground">{session.description}</p>
                          {session.payment_due && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-semibold">Pago: {formatPrice(session.payment_due.amount)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Contenedor Derecho (Acción o Estado) */}
                        <div className="flex-shrink-0 ml-4">
                            {session.status === 'pending' ? (
                                <Button size="sm" onClick={() => handleSelectSession(session)}>
                                    <PlusCircle className="w-4 h-4 mr-2" />Añadir
                                </Button>
                            ) : (
                                renderSessionStatusBadge(session.status)
                            )}
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

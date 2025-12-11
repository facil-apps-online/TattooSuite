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
                    {project.name} ({project.progress.completed}/{project.progress.total} completadas)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProjectId && isLoadingProjectDetails && <p>Cargando detalles del proyecto...</p>}

          {projectDetails && (
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Sesiones Pendientes:</h4>
              {projectDetails.sessions.filter(s => s.status === 'pending').length === 0 ? (
                <p className="text-muted-foreground">No hay sesiones pendientes para este proyecto.</p>
              ) : (
                <ul className="space-y-2">
                  {projectDetails.sessions
                    .filter(s => s.status === 'pending')
                    .map((session, index) => (
                      <li key={session.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Sesión {session.session_number}: {session.name}</p>
                          <p className="text-sm text-muted-foreground">{session.description}</p>
                          {session.payment_due && (
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary">Pago:</Badge>
                                <span className="text-sm font-semibold">{formatPrice(session.payment_due.amount)}</span>
                            </div>
                          )}
                        </div>
                        <Button size="sm" onClick={() => handleSelectSession(session)}>
                          <PlusCircle className="w-4 h-4 mr-2" />Añadir
                        </Button>
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

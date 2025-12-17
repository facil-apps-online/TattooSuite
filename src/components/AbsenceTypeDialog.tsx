import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreateAbsenceType, useUpdateAbsenceType, AbsenceType } from '@/hooks/useAbsenceTypes';
import { useToast } from '@/hooks/use-toast';

interface AbsenceTypeDialogProps {
  absenceType?: AbsenceType;
  isEdit?: boolean;
  children: React.ReactNode;
}

export function AbsenceTypeDialog({ absenceType, isEdit = false, children }: AbsenceTypeDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const createMutation = useCreateAbsenceType();
  const updateMutation = useUpdateAbsenceType();
  const { toast } = useToast();

  useEffect(() => {
    if (isEdit && absenceType) {
      setName(absenceType.name);
      setDescription(absenceType.description || '');
      setIsActive(absenceType.is_active);
    } else {
      setName('');
      setDescription('');
      setIsActive(true);
    }
  }, [isEdit, absenceType, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mutation = isEdit ? updateMutation : createMutation;
    const payload = isEdit ? { id: absenceType!.id, name, description, is_active: isActive } : { name, description };
    
    mutation.mutate(payload as any, {
      onSuccess: () => {
        toast({ title: 'Éxito', description: `Tipo de ausencia ${isEdit ? 'actualizado' : 'creado'}.`, variant: 'success' });
        setOpen(false);
      },
      onError: (error) => {
        toast({ title: 'Error', description: `No se pudo ${isEdit ? 'actualizar' : 'crear'}: ${error.message}`, variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar' : 'Crear'} Tipo de Ausencia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {isEdit && (
            <div className="flex items-center space-x-2">
              <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="is_active">Activo</Label>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

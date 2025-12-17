import React from 'react';
import { useGetAbsenceTypes, useDeleteAbsenceType } from '@/hooks/useAbsenceTypes';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2, UserX } from 'lucide-react';
import { AbsenceTypeDialog } from '@/components/AbsenceTypeDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function AbsenceTypesSettingsTab() {
  const { data: absenceTypes, isLoading, error } = useGetAbsenceTypes(true);
  const deleteMutation = useDeleteAbsenceType();
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: 'Éxito', description: 'Tipo de ausencia desactivado.', variant: 'success' });
      },
      onError: (error) => {
        toast({ title: 'Error', description: `No se pudo desactivar: ${error.message}`, variant: 'destructive' });
      }
    });
  };

  const renderDesktopView = () => (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead><span className="sr-only">Acciones</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {absenceTypes?.map((absenceType) => (
            <TableRow key={absenceType.id}>
              <TableCell className="font-medium">{absenceType.name}</TableCell>
              <TableCell>{absenceType.description}</TableCell>
              <TableCell>
                <Badge variant={absenceType.is_active ? 'default' : 'secondary'}>
                  {absenceType.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <AbsenceTypeDialog absenceType={absenceType} isEdit={true}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    </AbsenceTypeDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Desactivar
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Desactivar tipo de ausencia?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción marcará el tipo de ausencia como inactivo.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(absenceType.id)} className="bg-red-600 hover:bg-red-700">
                            Desactivar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserX className="w-5 h-5 text-primary" />
            Tipos de Ausencia
          </CardTitle>
          <CardDescription>Gestiona los tipos de ausencia para las solicitudes de tiempo libre del personal.</CardDescription>
        </div>
        <AbsenceTypeDialog>
          <Button size="sm">
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Añadir Tipo</span>
          </Button>
        </AbsenceTypeDialog>
      </CardHeader>
      <CardContent>
        {isLoading && <p>Cargando...</p>}
        {error && <p className="text-red-500">Error: {error.message}</p>}
        {renderDesktopView()}
      </CardContent>
    </Card>
  );
}

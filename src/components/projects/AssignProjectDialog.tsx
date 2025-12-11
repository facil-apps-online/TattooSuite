import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjects, useProjectDetails, useAssignProjectToClient } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { Client } from '@/hooks/useClients';
import { formatCurrency } from '@/lib/utils';

const formSchema = z.object({
  project_id: z.string().uuid("Debes seleccionar un proyecto."),
  selected_price_type: z.enum(['upfront', 'financed'], { required_error: "Debes seleccionar un tipo de precio." }),
  custom_final_price: z.preprocess(
    (val) => val ? Number(val) : undefined,
    z.number().min(0).optional()
  ),
  start_date: z.string().min(1, "La fecha de inicio es requerida."),
});

type FormData = z.infer<typeof formSchema>;

interface AssignProjectDialogProps {
  children: React.ReactNode;
  client: Client;
  onSuccess?: () => void;
}

export function AssignProjectDialog({ children, client, onSuccess }: AssignProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const { tenantId } = useAuth();

  const { data: projects, isLoading: isLoadingProjects } = useProjects(tenantId || '', 'project');
  
  const { control, register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  const selectedProjectId = watch('project_id');
  const selectedPriceType = watch('selected_price_type');
  
  const { data: projectDetails, isLoading: isLoadingDetails } = useProjectDetails(selectedProjectId);
  const { mutate: assignProject, isPending } = useAssignProjectToClient();

  const finalPrice = watch('custom_final_price') ?? 
                     (selectedPriceType === 'upfront' ? projectDetails?.upfront_price : projectDetails?.financed_price) ?? 0;

  const calculatedPlan = React.useMemo(() => {
    if (!projectDetails || !selectedPriceType) return [];
    if (selectedPriceType === 'upfront') {
        return [{ session_number: 1, amount: finalPrice }];
    }
    if (selectedPriceType === 'financed') {
        return projectDetails.sessions
            .map(session => {
                let amount = 0;
                if (session.fixed_payment_amount && session.fixed_payment_amount > 0) {
                    amount = session.fixed_payment_amount;
                } else if (session.payment_percentage && session.payment_percentage > 0) {
                    amount = finalPrice * (session.payment_percentage / 100);
                }
                return { session_number: session.session_number, amount };
            })
            .filter(p => p.amount > 0);
    }
    return [];
  }, [projectDetails, selectedPriceType, finalPrice]);

  const onSubmit = (data: FormData) => {
    if (!tenantId || !client.id) return;

    assignProject({
      client_id: client.id,
      project_id: data.project_id,
      selected_price_type: data.selected_price_type,
      start_date: data.start_date,
      custom_final_price: data.custom_final_price ? Number(data.custom_final_price) : null,
    }, {
      onSuccess: () => {
        setOpen(false);
        onSuccess?.();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asignar Proyecto a {client.name}</DialogTitle>
          <DialogDescription>
            Selecciona un proyecto y personaliza los detalles del proyecto para este cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label>Proyecto</Label>
                <Controller
                    name="project_id"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger disabled={isLoadingProjects}>
                                <SelectValue placeholder="Selecciona un proyecto..." />
                            </SelectTrigger>
                            <SelectContent>
                                {projects?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.project_id && <p className="text-sm text-red-500">{errors.project_id.message}</p>}
            </div>

            {projectDetails && (
                <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Tipo de Precio</Label>
                            <div className="flex gap-2 mt-2">
                                <Button
                                    type="button"
                                    variant={selectedPriceType === 'upfront' ? 'default' : 'outline'}
                                    onClick={() => setValue('selected_price_type', 'upfront')}
                                >
                                    Contado ({formatCurrency(projectDetails.upfront_price)})
                                </Button>
                                <Button
                                    type="button"
                                    variant={selectedPriceType === 'financed' ? 'default' : 'outline'}
                                    onClick={() => setValue('selected_price_type', 'financed')}
                                >
                                    Financiado ({formatCurrency(projectDetails.financed_price)})
                                </Button>
                            </div>
                        </div>
                        <div>
                            <Label>Precio Final (Personalizado)</Label>
                            <Input
                                type="number"
                                placeholder="Dejar en blanco para usar el del proyecto"
                                step="0.01"
                                {...register('custom_final_price')}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Fecha de Inicio</Label>
                            <Input type="date" {...register('start_date')} />
                        </div>
                    </div>
                    
                    <div className="p-4 bg-muted/20 rounded-lg">
                        <h4 className="font-semibold mb-2">Plan de Pagos Calculado</h4>
                        <p className="text-sm">Precio Final: <span className="font-bold">{formatCurrency(finalPrice)}</span></p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                            {calculatedPlan.map((payment, index) => (
                                <li key={index}>
                                    - Sesión {payment.session_number}: <span className="font-medium">{formatCurrency(payment.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <DialogFooter>
                <Button type="submit" disabled={isPending || !selectedProjectId}>
                    Asignar Proyecto
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

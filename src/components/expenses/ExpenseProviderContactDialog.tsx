
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTenantAction } from '@/lib/fetchTenantAction';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface ContactType {
    id: string;
    name: string;
    is_for_supplier: boolean;
}

interface ExpenseProviderContactDialogProps {
    providerId: string;
    children: React.ReactNode;
}

const contactSchema = z.object({
    name: z.string().min(1, "El nombre es requerido."),
    email: z.string().email("Email inválido.").optional().or(z.literal('')),
    phone: z.string().optional(),
    contact_type_id: z.string().uuid("Selecciona un tipo de contacto válido."),
});

export const ExpenseProviderContactDialog: React.FC<ExpenseProviderContactDialogProps> = ({ providerId, children }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const form = useForm<z.infer<typeof contactSchema>>({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            contact_type_id: '',
        },
    });

    const { data: contactTypes, isLoading: isLoadingContactTypes } = useQuery<ContactType[]>({
        queryKey: ['contactTypes', 'supplier'],
        queryFn: () => fetchTenantAction('get_contact_types', { applies_to: 'supplier' }),
    });

    const createContactMutation = useMutation({
        mutationFn: (newContact: any) => fetchTenantAction('create-expense-provider-contact', newContact),
        onSuccess: () => {
            toast({
                title: 'Éxito',
                description: 'Contacto creado correctamente.',
                variant: 'success',
            });
            queryClient.invalidateQueries({ queryKey: ['expenseProviderContacts', providerId] });
            setIsOpen(false);
            form.reset();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: `Hubo un error al crear el contacto: ${error.message}`,
                variant: 'destructive',
            });
        },
    });

    const onSubmit = (values: z.infer<typeof contactSchema>) => {
        createContactMutation.mutate({
            ...values,
            expense_provider_id: providerId,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Añadir Nuevo Contacto</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nombre del contacto" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="email@ejemplo.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Teléfono (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Número de teléfono" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contact_type_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Contacto</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingContactTypes}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {contactTypes?.map((type) => (
                                                <SelectItem key={type.id} value={type.id}>
                                                    {type.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={createContactMutation.isPending}>
                                {createContactMutation.isPending ? "Guardando..." : "Guardar Contacto"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

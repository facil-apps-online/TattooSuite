import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTenantAction } from "@/lib/fetchTenantAction";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useGetContactTypes } from "@/hooks/useContactTypes"; // Assuming this hook exists and is generic

interface ExpenseProviderContact {
    id: string;
    expense_provider_id: string;
    contact_type_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    contact_types: { name: string }; // Joined relation
}

const contactFormSchema = z.object({
    contact_type_id: z.string().min(1, "El tipo de contacto es requerido."),
    name: z.string().min(1, "El nombre es requerido."),
    email: z.string().email("Debe ser un email válido.").nullable().optional().or(z.literal('')),
    phone: z.string().nullable().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export const ExpenseProviderContactDialog = ({ providerId, contact, children }: { providerId: string, contact?: ExpenseProviderContact, children: React.ReactNode }) => {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (newContact: ContactFormValues & { expense_provider_id: string }) =>
            fetchTenantAction("create-expense-provider-contact", newContact),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenseProviderContacts", providerId] });
            toast({ title: "Éxito", description: "Contacto creado exitosamente.", variant: "success" });
            setOpen(false);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: (updatedContact: ContactFormValues & { id: string }) =>
            fetchTenantAction("update-expense-provider-contact", updatedContact),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenseProviderContacts", providerId] });
            toast({ title: "Éxito", description: "Contacto actualizado exitosamente.", variant: "success" });
            setOpen(false);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const { data: contactTypes, isLoading: isLoadingContactTypes } = useGetContactTypes();

    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: {
            contact_type_id: '',
            name: '',
            email: '',
            phone: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (contact) {
                form.reset({
                    contact_type_id: contact.contact_type_id,
                    name: contact.name,
                    email: contact.email,
                    phone: contact.phone,
                });
            } else {
                form.reset({
                    contact_type_id: '',
                    name: '',
                    email: '',
                    phone: '',
                });
            }
        }
    }, [open, contact, form]);

    const onSubmit = (values: ContactFormValues) => {
        if (contact) {
            updateMutation.mutate({ ...values, id: contact.id });
        } else {
            createMutation.mutate({ ...values, expense_provider_id: providerId });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{contact ? 'Editar Contacto' : 'Añadir Contacto'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={(e) => { e.stopPropagation(); form.handleSubmit(onSubmit)(e); }} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="contact_type_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Contacto</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingContactTypes}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {isLoadingContactTypes ? (
                                                <SelectItem value="loading" disabled>Cargando...</SelectItem>
                                            ) : (
                                                contactTypes?.filter(ct => ct.is_for_supplier).map(ct => ( // Reusing is_for_supplier for now
                                                    <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
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
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" {...field} />
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
                                    <FormLabel>Teléfono</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export const ExpenseProviderContactsManager = ({ providerId }: { providerId: string }) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

    const { data: contacts, isLoading } = useQuery<ExpenseProviderContact[]>({
        queryKey: ["expenseProviderContacts", providerId],
        queryFn: () => fetchTenantAction("get-expense-provider-contacts", { providerId }),
        enabled: !!providerId,
    });

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchTenantAction("delete-expense-provider-contact", { id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenseProviderContacts", providerId] });
            toast({ title: "Éxito", description: "Contacto eliminado exitosamente.", variant: "success" });
            setIsDeleteDialogOpen(false);
            setSelectedContactId(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            setIsDeleteDialogOpen(false);
            setSelectedContactId(null);
        },
    });

    const handleDeleteClick = (id: string) => {
        setSelectedContactId(id);
        setIsDeleteDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-1/fource" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-1/3" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div>
            <div className="space-y-4">
                {contacts?.map(contact => (
                    <Card key={contact.id}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="capitalize">{contact.contact_types.name}</CardTitle>
                            <div className="flex items-center gap-2">
                                <ExpenseProviderContactDialog providerId={providerId} contact={contact}>
                                    <Button variant="ghost" size="icon">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </ExpenseProviderContactDialog>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); handleDeleteClick(contact.id); }}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p><strong>Nombre:</strong> {contact.name}</p>
                            <p><strong>Email:</strong> {contact.email}</p>
                            <p><strong>Teléfono:</strong> {contact.phone}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <ConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}
                onConfirm={() => selectedContactId && deleteMutation.mutate(selectedContactId)}
                title="¿Estás seguro?"
                description="Esta acción eliminará el contacto permanentemente."
                isConfirming={deleteMutation.isPending}
                variant="destructive"
            />
        </div>
    );
};
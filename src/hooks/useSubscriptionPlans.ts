import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coreSupabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/types/supabase';

type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];

const fetchSubscriptionPlans = async (platformId: string): Promise<SubscriptionPlan[]> => {
  const { data, error } = await coreSupabase.functions.invoke('core-actions', {
    body: { action: 'get_subscription_plans_by_platform', payload: { platformId } },
  });

  if (error) {
    console.error('Error fetching subscription plans:', error);
    throw new Error(error.message);
  }

  return data || [];
};

const fetchSubscriptionPlanById = async (id: string): Promise<SubscriptionPlan | null> => {
  const { data, error } = await coreSupabase.functions.invoke('core-actions', {
    body: { action: 'get_subscription_plan_by_id', payload: { planId: id } },
  });

  if (error) throw new Error(error.message);

  return (data as SubscriptionPlan) || null;
};

const createSubscriptionPlan = async (
  plan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>
): Promise<SubscriptionPlan> => {
  const { data, error } = await coreSupabase.from('subscription_plans').insert(plan).select().single();

  if (error) throw new Error(error.message);

  return data;
};

const updateSubscriptionPlan = async (
  id: string,
  updates: Partial<SubscriptionPlan>
): Promise<SubscriptionPlan> => {
  const { data, error } = await coreSupabase
    .from('subscription_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
};

const deleteSubscriptionPlan = async (id: string): Promise<void> => {
  const { error } = await coreSupabase.from('subscription_plans').delete().eq('id', id);

  if (error) throw new Error(error.message);
};

export const useSubscriptionPlans = (platformId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery<SubscriptionPlan[], Error>({
    queryKey: ['subscription_plans', platformId],
    queryFn: () => fetchSubscriptionPlans(platformId),
    enabled: !!platformId,
  });

  const getByIdQuery = (id: string) =>
    useQuery<SubscriptionPlan | null, Error>({
      queryKey: ['subscription_plan', id],
      queryFn: () => fetchSubscriptionPlanById(id),
      enabled: !!id,
    });

  const createMutation = useMutation({
    mutationFn: createSubscriptionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
      toast({ title: 'Plan Creado', description: 'El plan ha sido creado exitosamente.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SubscriptionPlan> }) =>
      updateSubscriptionPlan(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
      toast({ title: 'Plan Actualizado', description: 'El plan ha sido actualizado exitosamente.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubscriptionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
      toast({ title: 'Plan Eliminado', description: 'El plan ha sido eliminado exitosamente.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    subscriptionPlans: listQuery,
    getById: getByIdQuery,
    createPlan: createMutation,
    updatePlan: updateMutation,
    deletePlan: deleteMutation,
  };
};

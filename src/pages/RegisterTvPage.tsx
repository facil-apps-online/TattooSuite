
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

import { useBranches } from '@/hooks/useBranches';

const RegisterTvPage: React.FC = () => {
  const { registrationCode } = useParams<{ registrationCode: string }>();
  const navigate = useNavigate();
  const { currentAssignment } = useAuth();
  // Fetch only active branches directly from the hook
  const { data: activeBranches = [], isLoading: isLoadingBranches } = useBranches(undefined, true);
  const { toast } = useToast();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeBranches.length === 1) {
      setSelectedBranchId(activeBranches[0].id);
    }
  }, [activeBranches]);

  const handleRegister = async () => {
    if (!registrationCode || !selectedBranchId || !currentAssignment) {
      toast({ title: "Error", description: "Faltan datos para el registro.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.rpc('register_tv', {
        p_registration_code: registrationCode,
        p_branch_id: selectedBranchId,
        p_tenant_id: currentAssignment.tenant_id,
      });

      if (error) {
        throw error;
      }

      toast({ title: "Éxito", description: "TV registrada correctamente.", variant: "success" });
      navigate('/app/settings/tv-management');
    } catch (err: any) {
      setError("Error al registrar la TV: " + err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <img src="/tattoosuite.app.png" alt="TattooSuite Logo" className="w-40 mb-6" />
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 text-gray-100">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-gray-100">Registrar Nueva TV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-gray-400 text-center">Estás a punto de registrar la TV con el código:</p>
            <p className="text-3xl font-bold text-center bg-gray-900 text-white p-4 rounded-md mt-2">{registrationCode}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="branch-select" className="font-medium text-gray-300">Asociar a la Sucursal:</label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId} disabled={isLoadingBranches}>
              <SelectTrigger id="branch-select" className="w-full bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder={isLoadingBranches ? "Cargando sucursales..." : "Selecciona una sucursal"} />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-700">
                {activeBranches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id} className="focus:bg-gray-700">{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-red-500 text-center">{error}</p>}

          <Button onClick={handleRegister} disabled={loading || !selectedBranchId || isLoadingBranches} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 text-lg py-6 rounded-lg font-bold">
            {loading ? 'Registrando...' : 'Confirmar y Activar TV'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterTvPage;

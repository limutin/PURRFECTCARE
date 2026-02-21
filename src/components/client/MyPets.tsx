import React, { useState, useEffect } from 'react';
import { projectId } from '../../utils/supabase/info';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { PawPrint, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface MyPetsProps {
  accessToken: string;
}

export function MyPets({ accessToken }: MyPetsProps) {
  const [pets, setPets] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [petsRes, diagnosesRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/pets`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/diagnoses`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      const petsData = await petsRes.json();
      const diagnosesData = await diagnosesRes.json();

      setPets(petsData.pets || []);
      setDiagnoses(diagnosesData.diagnoses || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load pets');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthday: string) => {
    const birthDate = new Date(birthday);
    const today = new Date();
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 +
      (today.getMonth() - birthDate.getMonth());

    if (ageInMonths < 12) {
      return `${ageInMonths} months`;
    }
    const years = Math.floor(ageInMonths / 12);
    return `${years} year${years > 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">My Pets</h2>
        <p className="text-muted-foreground">View your registered pets and their medical history</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-[140px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <PawPrint className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No pets registered yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pets.map((pet) => {
            const petDiagnoses = diagnoses.filter((d) => d.value.pet_id === pet.value.id);
            const lastVisit = petDiagnoses.length > 0
              ? new Date(Math.max(...petDiagnoses.map((d: any) => new Date(d.value.date).getTime())))
              : null;

            return (
              <Card key={pet.key} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{pet.value.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {pet.value.sex} • {calculateAge(pet.value.birthday)}
                      </CardDescription>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <PawPrint className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Birthday:</span>
                      <p className="font-medium">{formatDate(pet.value.birthday)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Color:</span>
                      <p className="font-medium">{pet.value.color || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Weight:</span>
                      <p className="font-medium">{pet.value.weight} kg</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Temperature:</span>
                      <p className="font-medium">{pet.value.temperature} °C</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Medical Records:</span>
                      <Badge variant="outline">{petDiagnoses.length} record{petDiagnoses.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    {lastVisit && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                        <Calendar className="w-4 h-4" />
                        Last visit: {formatDate(lastVisit)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

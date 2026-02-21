import React, { useState, useEffect } from 'react';
import { projectId } from '../../utils/supabase/info';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface MyAppointmentsProps {
  accessToken: string;
}

export function MyAppointments({ accessToken }: MyAppointmentsProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [appointmentsRes, petsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/appointments`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/pets`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      const appointmentsData = await appointmentsRes.json();
      const petsData = await petsRes.json();

      setAppointments(appointmentsData.appointments || []);
      setPets(petsData.pets || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const displayStatus = (status === 'pending' || status === 'confirmed') ? 'Scheduled' : status;
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      Scheduled: 'default',
      completed: 'outline',
    };
    return <Badge variant={variants[displayStatus] || 'default'}>{displayStatus}</Badge>;
  };

  const upcomingAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.value.date);
    return aptDate >= new Date() && apt.value.status !== 'completed';
  }).sort((a, b) => new Date(a.value.date).getTime() - new Date(b.value.date).getTime());

  const pastAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.value.date);
    return aptDate < new Date() || apt.value.status === 'completed';
  }).sort((a, b) => new Date(b.value.date).getTime() - new Date(a.value.date).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">My Appointments</h2>
        <p className="text-muted-foreground">View your upcoming and past appointments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Your scheduled visits</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-[140px]" />
                    <Skeleton className="h-6 w-[80px] rounded-full" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-4 w-[80px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming appointments
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((apt) => {
                const pet = pets.find((p) => p.value.id === apt.value.pet_id);
                const aptDate = new Date(apt.value.date);

                return (
                  <div
                    key={apt.key}
                    className="p-4 border border-border rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {pet?.value.name || 'Unknown Pet'}
                        </h4>
                        {apt.value.reason && (
                          <p className="text-sm text-muted-foreground">{apt.value.reason}</p>
                        )}
                      </div>
                      {getStatusBadge(apt.value.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {formatDate(aptDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {aptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past Appointments</CardTitle>
          <CardDescription>Your appointment history</CardDescription>
        </CardHeader>
        <CardContent>
          {pastAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No past appointments
            </div>
          ) : (
            <div className="space-y-4">
              {pastAppointments.slice(0, 5).map((apt) => {
                const pet = pets.find((p) => p.value.id === apt.value.pet_id);
                const aptDate = new Date(apt.value.date);

                return (
                  <div
                    key={apt.key}
                    className="p-4 border border-border rounded-lg opacity-75"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {pet?.value.name || 'Unknown Pet'}
                        </h4>
                        {apt.value.reason && (
                          <p className="text-sm text-muted-foreground">{apt.value.reason}</p>
                        )}
                      </div>
                      {getStatusBadge(apt.value.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {formatDate(aptDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {aptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

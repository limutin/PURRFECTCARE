import React, { useState, useEffect } from 'react';
import { getFunctionUrl, publicAnonKey } from '../../utils/supabase/info';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Calendar } from '../ui/calendar';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Plus, Calendar as CalendarIcon, Clock, Edit, Trash2, Bell, Loader2, MessageSquare, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AppointmentsManagerProps {
  accessToken: string;
}

export function AppointmentsManager({ accessToken }: AppointmentsManagerProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [sendingSms, setSendingSms] = useState<string | null>(null);

  // Form states
  const [petId, setPetId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [appointmentsRes, petsRes, ownersRes] = await Promise.all([
        fetch(getFunctionUrl('/appointments'), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }),
        fetch(getFunctionUrl('/pets'), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }),
        fetch(getFunctionUrl('/owners'), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }),
      ]);

      const appointmentsData = await appointmentsRes.json();
      const petsData = await petsRes.json();
      const ownersData = await ownersRes.json();

      setAppointments(appointmentsData.appointments || []);
      setPets(petsData.pets || []);
      setOwners(ownersData.owners || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingAppointment
        ? getFunctionUrl(`/appointments/${editingAppointment.key}`)
        : getFunctionUrl('/appointments');

      const method = editingAppointment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': publicAnonKey
        },
        body: JSON.stringify({
          pet_id: petId,
          date: appointmentDate,
          time: appointmentTime,
          frequency,
          reason,
          status: editingAppointment?.value.status || 'Scheduled',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save appointment');
      }

      toast.success(editingAppointment ? 'Appointment updated!' : 'Appointment scheduled!');
      setShowAddDialog(false);
      setEditingAppointment(null);
      setSaving(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error('Failed to save appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (appointmentKey: string, newStatus: string) => {
    try {
      const response = await fetch(
        getFunctionUrl(`/appointments/${appointmentKey}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update appointment');
      }

      toast.success('Appointment updated successfully!');
      fetchData();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const handleSendManualSms = async (appointmentKey: string, type: '1d' | 'sameday') => {
    setSendingSms(appointmentKey + type);
    try {
      const response = await fetch(getFunctionUrl('/send-sms'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': publicAnonKey
        },
        body: JSON.stringify({ appointment_id: appointmentKey, type })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send SMS');
      }

      toast.success(`SMS Reminder (${type === '1d' ? '1-Day' : 'Same-Day'}) sent successfully!`);
      fetchData();
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast.error(error.message || 'Failed to send SMS');
    } finally {
      setSendingSms(null);
    }
  };

  const handleCancelAppointment = async (appointmentKey: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    setCancellingId(appointmentKey);
    try {
      const response = await fetch(
        getFunctionUrl(`/appointments/${appointmentKey}`),
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel appointment');
      }

      toast.success('Appointment cancelled successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      toast.error(error.message || 'Failed to cancel appointment');
    } finally {
      setCancellingId(null);
    }
  };

  const startEdit = (apt: any) => {
    setEditingAppointment(apt);
    setPetId(apt.value.pet_id);
    setAppointmentDate(apt.value.date || '');
    setAppointmentTime(apt.value.time?.substring(0, 5) || '');
    setFrequency(apt.value.frequency || 'once');
    setReason(apt.value.reason || '');
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setPetId('');
    setAppointmentDate('');
    setAppointmentTime('');
    setFrequency('once');
    setReason('');
    setEditingAppointment(null);
  };

  const getStatusBadge = (status: string) => {
    const displayStatus = (status === 'pending' || status === 'confirmed') ? 'Scheduled' : status;
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      Scheduled: 'default',
      completed: 'outline',
    };
    return <Badge variant={variants[displayStatus] || 'default'}>{displayStatus}</Badge>;
  };

  const upcomingAppointments = appointments
    .filter(apt => {
      const aptDate = new Date(`${apt.value.date}T${apt.value.time || '00:00:00'}`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return aptDate >= today && apt.value.status !== 'completed';
    })
    .sort((a, b) => new Date(a.value.date).getTime() - new Date(b.value.date).getTime());

  const todayCount = upcomingAppointments.filter(apt => {
    const aptDate = new Date(apt.value.date);
    return aptDate.toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Appointments</h1>
          <p className="text-muted-foreground">Schedule and manage pet appointments</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Button variant="outline" className="relative">
              <Bell className="w-4 h-4" />
              {todayCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                  {todayCount}
                </span>
              )}
            </Button>
          </div>
          <Dialog open={showAddDialog} onOpenChange={(open: boolean) => {
            setShowAddDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}</DialogTitle>
                <DialogDescription>
                  {editingAppointment ? 'Update appointment details' : 'Create a new appointment for a pet'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddOrUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pet">Pet *</Label>
                  <Select value={petId} onValueChange={setPetId} required>
                    <SelectTrigger id="pet">
                      <SelectValue placeholder="Select a pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => {
                        const owner = owners.find((o) => o.value.id === pet.value.owner_id);
                        return (
                          <SelectItem key={pet.key} value={pet.value.id}>
                            <div className="flex flex-col py-1">
                              <span className="font-bold">{pet.value.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase font-mono">Owner: {owner?.value.name || 'N/A'}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">One-time</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="3months">Every 3 Months</SelectItem>
                      <SelectItem value="6months">Every 6 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    placeholder="e.g., Vaccination, Check-up"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowAddDialog(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingAppointment ? 'Update' : 'Schedule'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Upcoming
              </CardTitle>
              <CardDescription>Next 5 appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingAppointments.slice(0, 5).map(apt => {
                  const pet = pets.find(p => p.value.id === apt.value.pet_id);
                  const aptDate = new Date(`${apt.value.date}T${apt.value.time || '00:00:00'}`);
                  return (
                    <div key={apt.key} className="text-sm p-2 bg-muted/50 rounded-md">
                      <div className="font-semibold">{pet?.value.name || 'Pet'}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(aptDate)} @ {aptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
                {upcomingAppointments.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center">No upcoming appointments</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Appointments List</CardTitle>
            <CardDescription>
              {selectedDate
                ? `Showing appointments for ${formatDate(selectedDate)}`
                : 'All appointments'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                      <Skeleton className="h-6 w-[80px] rounded-full" />
                    </div>
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-[120px]" />
                      <Skeleton className="h-4 w-[80px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No appointments scheduled yet
              </div>
            ) : (
              <div className="space-y-4">
                {appointments
                  .filter((apt) => {
                    if (!selectedDate) return true;
                    const aptDate = new Date(`${apt.value.date}T${apt.value.time || '00:00:00'}`);
                    return aptDate.toDateString() === selectedDate.toDateString();
                  })
                  .sort((a, b) => new Date(a.value.date).getTime() - new Date(b.value.date).getTime())
                  .map((apt) => {
                    const pet = pets.find((p) => p.value.id === apt.value.pet_id);
                    const owner = owners.find((o) => o.value.id === pet?.value.owner_id);
                    const aptDate = new Date(`${apt.value.date}T${apt.value.time || '00:00:00'}`);

                    return (
                      <div
                        key={apt.key}
                        className="p-4 border border-border rounded-lg hover:border-primary transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-primary">
                                {pet?.value.name || 'Unknown Pet'}
                              </h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Owner: {owner?.value.name || 'Unknown'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(apt.value.status)}
                            {apt.value.frequency && apt.value.frequency !== 'once' && (
                              <Badge variant="outline" className="text-[10px] h-5">Recurrence: {apt.value.frequency}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {formatDate(aptDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {aptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {apt.value.reason && (
                          <p className="text-sm text-muted-foreground mb-3 font-medium">
                            Reason: <span className="font-normal">{apt.value.reason}</span>
                          </p>
                        )}
                        {(apt.value.sms_1d_sent || apt.value.sms_sameday_sent) && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {apt.value.sms_1d_sent && (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground bg-muted font-normal border-none">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                1-Day Reminder SMS Sent
                              </Badge>
                            )}
                            {apt.value.sms_sameday_sent && (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground bg-muted font-normal border-none">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Same-Day Reminder SMS Sent
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-4 flex-wrap gap-2">
                          <div className="flex flex-wrap gap-2">
                            {apt.value.status === 'Scheduled' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStatus(apt.key, 'completed')}
                                >
                                  Mark Complete
                                </Button>
                                {!apt.value.sms_1d_sent && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendManualSms(apt.key, '1d')}
                                    disabled={sendingSms === apt.key + '1d'}
                                  >
                                    {sendingSms === apt.key + '1d' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MessageSquare className="w-3 h-3 mr-1" />}
                                    Send 1D
                                  </Button>
                                )}
                                {!apt.value.sms_sameday_sent && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendManualSms(apt.key, 'sameday')}
                                    disabled={sendingSms === apt.key + 'sameday'}
                                  >
                                    {sendingSms === apt.key + 'sameday' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MessageSquare className="w-3 h-3 mr-1" />}
                                    Send Same-Day
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(apt)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleCancelAppointment(apt.key)}
                              disabled={cancellingId === apt.key}
                            >
                              {cancellingId === apt.key ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4 mr-1" />
                              )}
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {appointments.filter((apt) => {
                  if (!selectedDate) return true;
                  const aptDate = new Date(apt.value.date);
                  return aptDate.toDateString() === selectedDate.toDateString();
                }).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground italic">
                      No appointments for this date
                    </div>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { projectId } from '../../utils/supabase/info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Users, Calendar, Package, Banknote, AlertCircle } from 'lucide-react';

interface DashboardOverviewProps {
  accessToken: string;
  onNavigate?: (tab: string) => void;
}

export function DashboardOverview({ accessToken, onNavigate }: DashboardOverviewProps) {
  const [stats, setStats] = useState({
    totalPets: 0,
    todayAppointments: 0,
    lowStockItems: 0,
    pendingBills: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [petsRes, appointmentsRes, inventoryRes, billingRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/pets`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/appointments`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/inventory`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/billing`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      const pets = await petsRes.json();
      const appointments = await appointmentsRes.json();
      const inventory = await inventoryRes.json();
      const billing = await billingRes.json();

      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = appointments.appointments?.filter((apt: any) =>
        apt.value.date?.startsWith(today)
      ).length || 0;

      const lowStockItems = inventory.inventory?.filter((item: any) =>
        item.value.quantity < 20
      ).length || 0;

      const pendingBills = billing.bills?.filter((bill: any) =>
        bill.value.status === 'unpaid'
      ).length || 0;

      setStats({
        totalPets: pets.pets?.length || 0,
        todayAppointments,
        lowStockItems,
        pendingBills,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Pets',
      value: stats.totalPets,
      description: 'Registered in system',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Today\'s Appointments',
      value: stats.todayAppointments,
      description: 'Scheduled for today',
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      description: 'Need restocking',
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Pending Bills',
      value: stats.pendingBills,
      description: 'Awaiting payment',
      icon: Banknote,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your veterinary clinic dashboard</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse w-24 mb-2"></div>
                <div className="h-8 bg-muted rounded animate-pulse w-16"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded animate-pulse w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`${card.bgColor} p-2 rounded-lg`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="p-4 border border-border rounded-lg hover:border-primary transition-colors cursor-pointer"
              onClick={() => onNavigate?.('clients')}
            >
              <h4 className="font-medium text-foreground mb-1">Register New Pet</h4>
              <p className="text-sm text-muted-foreground">Add a new pet and owner to the system</p>
            </div>
            <div
              className="p-4 border border-border rounded-lg hover:border-primary transition-colors cursor-pointer"
              onClick={() => onNavigate?.('appointments')}
            >
              <h4 className="font-medium text-foreground mb-1">Schedule Appointment</h4>
              <p className="text-sm text-muted-foreground">Book a new appointment for a pet</p>
            </div>
            <div
              className="p-4 border border-border rounded-lg hover:border-primary transition-colors cursor-pointer"
              onClick={() => onNavigate?.('diagnosis')}
            >
              <h4 className="font-medium text-foreground mb-1">Create Diagnosis</h4>
              <p className="text-sm text-muted-foreground">Record medical diagnosis for a patient</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

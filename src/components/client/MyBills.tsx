import React, { useState, useEffect } from 'react';
import { projectId } from '../../utils/supabase/info';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Banknote } from 'lucide-react';
import { toast } from 'sonner';

interface MyBillsProps {
  accessToken: string;
}

export function MyBills({ accessToken }: MyBillsProps) {
  const [bills, setBills] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [billsRes, petsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/billing`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/pets`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      const billsData = await billsRes.json();
      const petsData = await petsRes.json();

      setBills(billsData.bills || []);
      setPets(petsData.pets || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const totalUnpaid = bills
    .filter((bill) => bill.value.status === 'unpaid')
    .reduce((sum, bill) => sum + bill.value.total_cost, 0);

  const totalPaid = bills
    .filter((bill) => bill.value.status === 'paid')
    .reduce((sum, bill) => sum + bill.value.total_cost, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">My Bills</h2>
        <p className="text-muted-foreground">View your payment history and outstanding bills</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">₱{totalUnpaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {bills.filter((b) => b.value.status === 'unpaid').length} unpaid bill(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">₱{totalPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {bills.filter((b) => b.value.status === 'paid').length} paid bill(s)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bills</CardTitle>
          <CardDescription>Your billing history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-4 w-[110px]" />
                  <Skeleton className="h-4 w-[90px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-5 w-[70px] rounded-full" />
                </div>
              ))}
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-12">
              <Banknote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bills yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills
                    .sort((a, b) => new Date(b.value.created_at).getTime() - new Date(a.value.created_at).getTime())
                    .map((bill) => {
                      const pet = pets.find((p) => p.value.id === bill.value.pet_id);
                      return (
                        <TableRow key={bill.key}>
                          <TableCell>{formatDate(bill.value.created_at)}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {bill.value.id.substring(0, 12).toUpperCase()}
                          </TableCell>
                          <TableCell className="font-medium">{pet?.value.name || 'Unknown'}</TableCell>
                          <TableCell className="font-semibold">₱{bill.value.total_cost.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={bill.value.status === 'paid' ? 'default' : 'secondary'}>
                              {bill.value.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

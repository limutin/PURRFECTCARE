import React, { useState, useEffect } from 'react';
import { getFunctionUrl, publicAnonKey } from '../../utils/supabase/info';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Plus, Package, AlertCircle, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryManagerProps {
  accessToken: string;
}

export function InventoryManager({ accessToken }: InventoryManagerProps) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterExpiring, setFilterExpiring] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await fetch(
        getFunctionUrl('/inventory'),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }
      );

      const data = await response.json();
      setInventory(data.inventory || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(
        getFunctionUrl('/inventory'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
          body: JSON.stringify({
            name,
            category,
            quantity: parseInt(quantity),
            expiry_date: expiryDate,
            price: parseFloat(price),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      toast.success('Item added successfully!');
      setShowAddDialog(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSaving(true);

    try {
      const response = await fetch(
        getFunctionUrl(`/inventory/${editingItem.value.id}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
          body: JSON.stringify({
            name,
            category,
            quantity: parseInt(quantity),
            expiry_date: expiryDate,
            price: parseFloat(price),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      toast.success('Item updated successfully!');
      setEditingItem(null);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    setDeletingId(itemId);
    try {
      const response = await fetch(
        getFunctionUrl(`/inventory/${itemId}`),
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      toast.success('Item deleted successfully!');
      fetchInventory();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    setName(item.value.name);
    setCategory(item.value.category);
    setQuantity(item.value.quantity.toString());
    setExpiryDate(item.value.expiry_date);
    setPrice(item.value.price.toString());
  };

  const resetForm = () => {
    setName('');
    setCategory('');
    setQuantity('');
    setExpiryDate('');
    setPrice('');
    setEditingItem(null);
  };

  const getStockBadge = (qty: number) => {
    if (qty === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (qty < 20) return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">Low Stock</Badge>;
    return <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200">In Stock</Badge>;
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.value.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.value.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.value.category === filterCategory;
    const matchesExpiring = !filterExpiring || isExpiringSoon(item.value.expiry_date);

    return matchesSearch && matchesCategory && matchesExpiring;
  });

  const lowStockItems = inventory.filter(item => item.value.quantity < 20);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">Manage medicines and medical supplies</p>
        </div>
        <Dialog open={showAddDialog || !!editingItem} onOpenChange={(open: boolean) => {
          if (!open) {
            setShowAddDialog(false);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Medicine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update inventory item details' : 'Add a new medicine or supply to inventory'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editingItem ? handleUpdateItem : handleAddItem} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Medicine Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Antibiotic">Antibiotic</SelectItem>
                    <SelectItem value="Vaccine">Vaccine</SelectItem>
                    <SelectItem value="Anti-inflammatory">Anti-inflammatory</SelectItem>
                    <SelectItem value="Supplement">Supplement</SelectItem>
                    <SelectItem value="Analgesic">Analgesic</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₱) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry-date">Expiration Date *</Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
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
                  {editingItem ? 'Update' : 'Add'} Item
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <div className="text-sm text-orange-800">
            <span className="font-bold">Attention:</span> {lowStockItems.length} items are running low on stock. Please restock soon.
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-9 w-16" /> : <div className="text-3xl font-bold">{inventory.length}</div>}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-9 w-16" /> : <div className="text-3xl font-bold text-orange-600">{lowStockItems.length}</div>}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Expiring Soon / Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-9 w-16" /> : (
              <div className="text-3xl font-bold text-red-600">
                {inventory.filter(item => isExpiringSoon(item.value.expiry_date) || isExpired(item.value.expiry_date)).length}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Inventory List</CardTitle>
              <CardDescription>All medicines and supplies in stock</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Antibiotic">Antibiotic</SelectItem>
                  <SelectItem value="Vaccine">Vaccine</SelectItem>
                  <SelectItem value="Anti-inflammatory">Anti-inflammatory</SelectItem>
                  <SelectItem value="Supplement">Supplement</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={filterExpiring ? "default" : "outline"}
                size="sm"
                className="h-9 gap-2"
                onClick={() => setFilterExpiring(!filterExpiring)}
              >
                <AlertCircle className="w-4 h-4" />
                <span>Expiring Soon</span>
              </Button>

              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-4 w-[180px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[60px]" />
                  <Skeleton className="h-4 w-[70px]" />
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-5 w-[80px] rounded-full" />
                  <Skeleton className="h-8 w-[70px]" />
                </div>
              ))}
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell className="font-medium">{item.value.name}</TableCell>
                      <TableCell>{item.value.category}</TableCell>
                      <TableCell className="font-semibold">{item.value.quantity}</TableCell>
                      <TableCell>₱{item.value.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={isExpired(item.value.expiry_date) ? 'text-red-600 font-bold bg-red-50 px-2 py-1 rounded' : isExpiringSoon(item.value.expiry_date) ? 'text-orange-600 font-semibold' : ''}>
                          {formatDate(item.value.expiry_date)}
                          {isExpired(item.value.expiry_date) && ' (Expired)'}
                          {isExpiringSoon(item.value.expiry_date) && !isExpired(item.value.expiry_date) && ' ⚠️'}
                        </span>
                      </TableCell>
                      <TableCell>{getStockBadge(item.value.quantity)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteItem(item.value.id)}
                            disabled={deletingId === item.value.id}
                          >
                            {deletingId === item.value.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

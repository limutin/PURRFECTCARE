import React, { useState, useEffect } from 'react';
import { getFunctionUrl, publicAnonKey } from '../../utils/supabase/info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Eye, Plus, Search, User, PawPrint, Trash2, Loader2, Edit2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface ClientsPetsManagerProps {
  accessToken: string;
}

export function ClientsPetsManager({ accessToken }: ClientsPetsManagerProps) {
  const [owners, setOwners] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPet, setEditingPet] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [ownerName, setOwnerName] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [ownerContact, setOwnerContact] = useState('');
  const [petName, setPetName] = useState('');
  const [petBirthday, setPetBirthday] = useState('');
  const [petColor, setPetColor] = useState('');
  const [petType, setPetType] = useState('Dog');
  const [petSex, setPetSex] = useState('male');
  const [petWeight, setPetWeight] = useState('');
  const [petTemperature, setPetTemperature] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ownersRes, petsRes] = await Promise.all([
        fetch(getFunctionUrl('/owners'), {
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
      ]);

      const ownersData = await ownersRes.json();
      const petsData = await petsRes.json();

      setOwners(ownersData.owners || []);
      setPets(petsData.pets || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOwnerAndPet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(
        getFunctionUrl('/owners'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
          body: JSON.stringify({
            owner: {
              name: ownerName,
              address: ownerAddress,
              contact: ownerContact,
            },
            pet: {
              name: petName,
              type: petType,
              birthday: petBirthday,
              color: petColor,
              sex: petSex,
              weight: parseFloat(petWeight),
              temperature: parseFloat(petTemperature),
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add owner and pet');
      }

      toast.success('Owner and pet added successfully!');
      setShowAddDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error adding owner and pet:', error);
      toast.error('Failed to add owner and pet');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPet) return;
    setSaving(true);

    try {
      // Update owner
      const ownerUpdate = await fetch(
        getFunctionUrl(`/owners/${editingPet.value.owner_id}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
          body: JSON.stringify({
            name: ownerName,
            address: ownerAddress,
            contact: ownerContact,
          }),
        }
      );

      // Update pet
      const petUpdate = await fetch(
        getFunctionUrl(`/pets/${editingPet.value.id}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
          body: JSON.stringify({
            name: petName,
            type: petType,
            birthday: petBirthday,
            color: petColor,
            sex: petSex,
            weight: parseFloat(petWeight),
            temperature: parseFloat(petTemperature),
          }),
        }
      );

      if (!ownerUpdate.ok || !petUpdate.ok) {
        throw new Error('Failed to update information');
      }

      toast.success('Information updated successfully!');
      setEditingPet(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Failed to update information');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickUpdate = async (petId: string, newType: string) => {
    setSaving(true);
    try {
      const response = await fetch(
        getFunctionUrl(`/pets/${petId}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
          body: JSON.stringify({ type: newType }),
        }
      );

      if (!response.ok) throw new Error('Update failed');

      toast.success(`Pet classified as ${newType}`);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update pet type');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (pet: any) => {
    const owner = owners.find(o => o.value.id === pet.value.owner_id || o.key === pet.value.owner_id);
    setEditingPet(pet);
    if (owner) {
      setOwnerName(owner.value.name);
      setOwnerAddress(owner.value.address);
      setOwnerContact(owner.value.contact);
    }
    setPetName(pet.value.name);
    setPetType(pet.value.type || 'Dog');
    setPetBirthday(pet.value.birthday);
    setPetColor(pet.value.color || '');
    setPetSex(pet.value.sex);
    setPetWeight(pet.value.weight.toString());
    setPetTemperature(pet.value.temperature?.toString() || '');
  };

  const resetForm = () => {
    setOwnerName('');
    setOwnerAddress('');
    setOwnerContact('');
    setPetName('');
    setPetType('Dog');
    setPetBirthday('');
    setPetColor('');
    setPetSex('male');
    setPetWeight('');
    setPetTemperature('');
    setEditingPet(null);
  };

  const filteredPets = pets.filter((pet) => {
    const owner = owners.find((o) => o.value.id === pet.value.owner_id || o.key === pet.value.owner_id);
    const s = searchTerm.toLowerCase();
    return (
      pet.value.name?.toLowerCase().includes(s) ||
      owner?.value.name?.toLowerCase().includes(s) ||
      owner?.value.address?.toLowerCase().includes(s) ||
      pet.value.pet_uid?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Clients & Pets</h1>
          <p className="text-muted-foreground">Manage your clinic database</p>
        </div>
        <Dialog open={showAddDialog || !!editingPet} onOpenChange={(o: boolean) => { if (!o) { setShowAddDialog(false); setEditingPet(null); resetForm(); } }}>
          {!editingPet && (
            <DialogTrigger asChild>
              <Button onClick={() => setShowAddDialog(true)}><Plus className="w-4 h-4 mr-2" /> Add Client & Pet</Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPet ? 'Update Record' : 'Register New Client'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={editingPet ? handleUpdate : handleAddOwnerAndPet} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-bold text-primary"><User className="w-4 h-4" /> Owner Information</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Name *</Label><Input value={ownerName} onChange={e => setOwnerName(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Contact *</Label><Input value={ownerContact} onChange={e => setOwnerContact(e.target.value)} required /></div>
                  <div className="col-span-2 space-y-2"><Label>Address *</Label><Input value={ownerAddress} onChange={e => setOwnerAddress(e.target.value)} required /></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-bold text-primary"><PawPrint className="w-4 h-4" /> Pet Information</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Pet Name *</Label><Input value={petName} onChange={e => setPetName(e.target.value)} required /></div>
                  <div className="space-y-2">
                    <Label>Type of Pet *</Label>
                    <Select value={petType} onValueChange={setPetType} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dog">Dog</SelectItem>
                        <SelectItem value="Cat">Cat</SelectItem>
                        <SelectItem value="Bird">Bird</SelectItem>
                        <SelectItem value="Rabbit">Rabbit</SelectItem>
                        <SelectItem value="Reptile">Reptile</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={petSex} onValueChange={setPetSex} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sex" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Birthday *</Label><Input type="date" value={petBirthday} onChange={e => setPetBirthday(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Weight (kg) *</Label><Input type="number" step="0.1" value={petWeight} onChange={e => setPetWeight(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Temp (°C) *</Label><Input type="number" step="0.1" value={petTemperature} onChange={e => setPetTemperature(e.target.value)} required /></div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowAddDialog(false); setEditingPet(null); resetForm(); }} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingPet ? 'Save Changes' : 'Register'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pet Name</TableHead>
                <TableHead>Pet Type</TableHead>
                <TableHead>Owner Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredPets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No records found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPets.map((p) => {
                  const owner = owners.find((o: any) => o.value.id === p.value.owner_id || o.key === p.value.owner_id);
                  return (
                    <TableRow key={p.key} className="hover:bg-muted/5 transition-colors">
                      <TableCell>
                        <div className="flex flex-col py-1">
                          <span className="font-bold text-primary">{p.value.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {p.value.type || 'Unclassified'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col py-1">
                          <span className="font-semibold">{owner?.value.name || 'Unknown'}</span>
                          <span className="text-[10px] text-muted-foreground italic border-l-2 border-primary/20 pl-2 mt-1">{owner?.value.contact || 'No contact info'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm opacity-80">{owner?.value.address || 'N/A'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(p)} className="hover:bg-primary/10 hover:text-primary transition-all">
                          <User className="w-4 h-4 mr-2" />
                          Patient File
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

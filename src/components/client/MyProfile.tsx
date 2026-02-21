import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { User } from 'lucide-react';

interface MyProfileProps {
  user: any;
  accessToken: string;
}

export function MyProfile({ user, accessToken }: MyProfileProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">My Profile</h2>
        <p className="text-muted-foreground">View your account information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={user.name} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={user.email} disabled />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <div>
              <Badge variant="outline" className="capitalize">
                {user.role}
              </Badge>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              To update your profile information, please contact the clinic staff.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

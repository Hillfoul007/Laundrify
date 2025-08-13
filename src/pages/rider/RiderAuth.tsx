import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RiderRegistration from './RiderRegistration';
import RiderLogin from './RiderLogin';

export default function RiderAuth() {
  const [activeTab, setActiveTab] = useState('login');

  // Add console log to verify component is loading
  console.log('🔍 RiderAuth component loading...', { activeTab, location: window.location.href });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-purple-600">
            Rider Portal
          </CardTitle>
          <CardDescription>
            Join our delivery team or login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <RiderLogin />
            </TabsContent>

            <TabsContent value="register">
              <RiderRegistration />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

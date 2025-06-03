
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShoppingBag, Mail } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const activationRequestSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  role: z.string().min(1, { message: "Please select a role" }),
  reason: z.string().min(10, { message: "Please provide a reason for account access (minimum 10 characters)" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ActivationRequestFormValues = z.infer<typeof activationRequestSchema>;

const Auth: React.FC = () => {
  const { user, loading, signIn } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('login');

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const activationRequestForm = useForm<ActivationRequestFormValues>({
    resolver: zodResolver(activationRequestSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      reason: '',
    },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    setAuthLoading(true);
    try {
      await signIn(data.email, data.password);
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const onActivationRequestSubmit = async (data: ActivationRequestFormValues) => {
    setRequestLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-activation-request', {
        body: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          role: data.role,
          reason: data.reason,
        },
      });

      if (error) throw error;

      toast.success('Account activation request sent successfully! You will be notified once your account is approved.');
      activationRequestForm.reset();
      setActiveTab('login');
    } catch (error: any) {
      console.error("Activation request error:", error);
      toast.error(error.message || 'Failed to send activation request');
    } finally {
      setRequestLoading(false);
    }
  };

  if (user && !loading) {
    return <Navigate to="/" />;
  }

  return (
    <div className="container flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome to TableFlow</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or request access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="request">Request Access</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4 mt-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={authLoading}>
                    {authLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>

                  <div className="text-center mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Want to place an order without an account?</p>
                    <Link to="/order">
                      <Button variant="outline" className="w-full">
                        <ShoppingBag size={16} className="mr-2" />
                        Order as Guest
                      </Button>
                    </Link>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="request">
              <Form {...activationRequestForm}>
                <form onSubmit={activationRequestForm.handleSubmit(onActivationRequestSubmit)} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={activationRequestForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={activationRequestForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={activationRequestForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={activationRequestForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requested Role</FormLabel>
                        <FormControl>
                          <select 
                            {...field} 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select a role</option>
                            <option value="customer">Customer</option>
                            <option value="delivery">Delivery</option>
                            <option value="seller">Seller</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={activationRequestForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Access</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please explain why you need access to this system..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={requestLoading}>
                    {requestLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending request...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Request Account Access
                      </>
                    )}
                  </Button>

                  <div className="text-center mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Want to place an order without an account?</p>
                    <Link to="/order">
                      <Button variant="outline" className="w-full">
                        <ShoppingBag size={16} className="mr-2" />
                        Order as Guest
                      </Button>
                    </Link>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            TableFlow - Custom Furniture Ordering System
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;

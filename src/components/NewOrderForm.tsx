
import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tableSizeOptions, colourOptions } from '@/types/order';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  customerName: z.string().min(2, { message: "Customer name must be at least 2 characters" }),
  address: z.string().min(5, { message: "Please enter a valid address" }),
  contactNumber: z.string().min(10, { message: "Please enter a valid phone number" }),
  tableSize: z.string(),
  colour: z.string(),
  quantity: z.coerce.number().int().positive().min(1, { message: "Quantity must be at least 1" }),
});

type OrderFormValues = z.infer<typeof formSchema>;

export function NewOrderForm() {
  const { addOrder } = useApp();
  const { profile } = useAuth();
  
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: profile?.role === 'customer' ? profile?.full_name || "" : "",
      address: profile?.role === 'customer' ? profile?.address || "" : "",
      contactNumber: profile?.role === 'customer' ? profile?.contact_number || "" : "",
      tableSize: "medium",
      colour: "oak",
      quantity: 1,
    },
  });

  async function onSubmit(values: OrderFormValues) {
    try {
      await addOrder({
        customerName: values.customerName,
        address: values.address,
        contactNumber: values.contactNumber,
        tableSize: values.tableSize,
        colour: values.colour,
        quantity: values.quantity,
      });
      form.reset({
        customerName: profile?.role === 'customer' ? profile?.full_name || "" : "",
        address: profile?.role === 'customer' ? profile?.address || "" : "",
        contactNumber: profile?.role === 'customer' ? profile?.contact_number || "" : "",
        tableSize: "medium",
        colour: "oak",
        quantity: 1,
      });
    } catch (error) {
      console.error("Error adding order:", error);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>New Table Order</CardTitle>
        <CardDescription>Create a new delivery order for a customer</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="123 Furniture St, Woodtown" 
                      className="min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="tableSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table Size</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tableSizeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="colour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wood/Colour</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select colour" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colourOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" className="w-full">
              Add New Order
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default NewOrderForm;

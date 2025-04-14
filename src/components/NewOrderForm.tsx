import React, { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import TableItemForm from './TableItemForm';
import { TableItem } from '@/types/order';

// Define schema for a single table item
const tableItemSchema = z.object({
  id: z.string(),
  size: z.string(),
  colour: z.string(),
  quantity: z.number().int().positive().min(1, { message: "Quantity must be at least 1" }),
  price: z.number()
});

// Define the overall form schema
const formSchema = z.object({
  customerName: z.string().min(2, { message: "Customer name must be at least 2 characters" }),
  address: z.string().min(5, { message: "Please enter a valid address" }),
  contactNumber: z.string().min(10, { message: "Please enter a valid phone number" }),
  tables: z.array(tableItemSchema).min(1, { message: "At least one table is required" }),
  note: z.string().optional(),
});

type OrderFormValues = z.infer<typeof formSchema>;

export function NewOrderForm() {
  const { addOrder } = useApp();
  
  const form = useFormProvider();

  const watchTables = form.watch("tables");
  const totalPrice = React.useMemo(() => {
    return watchTables?.reduce((sum, table) => sum + (table.price || 0), 0) || 0;
  }, [watchTables]);

  // Handle form submission
  async function onSubmit(values: OrderFormValues) {
    try {
      // Prepare order data with the tables
      const orderData = {
        customerName: values.customerName,
        address: values.address,
        contactNumber: values.contactNumber,
        tables: values.tables.map((table) => ({
          id: table.id!,
          size: table.size!,
          colour: table.colour!,
          quantity: table.quantity!,
          price: table.price!,
        })),
        note: values.note || "",
        totalPrice
      };
      
      await addOrder(orderData);
      form.reset({
        customerName: "",
        address: "",
        contactNumber: "",
        tables: [createEmptyTable()],
        note: "",
      });
      toast.success("Order created successfully!");
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred when creating your order');
    }
  }

  // Create a new empty table with default values
  const createEmptyTable = (): TableItem => ({
    id: uuidv4(),
    size: '24x32',
    colour: 'white',
    quantity: 1,
    price: 10500  // Default price for 24x32 table
  });

  // Add a new table to the form
  const addTable = () => {
    const currentTables = form.getValues("tables") || [];
    form.setValue("tables", [...currentTables, createEmptyTable()]);
  };

  // Remove a table from the form
  const removeTable = (index: number) => {
    const currentTables = form.getValues("tables");
    if (currentTables.length > 1) {
      form.setValue("tables", currentTables.filter((_, i) => i !== index));
    }
  };

  // Format price in Indian Rupees
  const getFormattedPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>New Table Order</CardTitle>
        <CardDescription>Create a new delivery order for a customer</CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
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
            
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Tables</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addTable}
                  className="flex items-center"
                >
                  <Plus size={16} className="mr-1" />
                  Add Table
                </Button>
              </div>
              
              {watchTables?.map((table, index) => (
                <TableItemForm
                  key={table.id}
                  index={index}
                  onRemove={() => removeTable(index)}
                  showRemoveButton={watchTables.length > 1}
                />
              ))}
              
              <div className="mt-6 text-right">
                <p className="text-lg font-semibold">
                  Total Order Price: {getFormattedPrice(totalPrice)}
                </p>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any special requirements or notes about the order" 
                      className="min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full">
              Add New Order
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}

// Custom hook for form setup to separate logic
function useFormProvider() {
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      address: "",
      contactNumber: "",
      tables: [
        {
          id: uuidv4(),
          size: '24x32',
          colour: 'white',
          quantity: 1,
          price: 10500
        }
      ],
      note: "",
    },
  });

  return form;
}

export default NewOrderForm;

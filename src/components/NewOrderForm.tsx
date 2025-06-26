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
  topColour: z.string(),
  frameColour: z.string(),
  colour: z.string(), // Keep for backward compatibility
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
  deliveryFee: z.number().nonnegative().optional().default(0),
  additionalCharges: z.number().nonnegative().optional().default(0),
});

type OrderFormValues = z.infer<typeof formSchema>;

// Delivery charge mapping based on table sizes
const getDeliveryChargeForSize = (size: string): number => {
  const sizeMap: { [key: string]: number } = {
    '24x32': 2400, // 2 × 2.5
    '24x36': 2400, // 2 × 2.5
    '24x48': 2600, // 2 × 3
    '24x60': 2600, // 2 × 3
    '24x72': 2700, // 2 × 4
    '24x84': 2700, // 2 × 4
    '24x96': 2700, // 2 × 4
    '30x48': 2700, // 2 × 4
    '36x48': 2700, // 2 × 4
    '48x48': 2700, // 2 × 4
    '30x60': 3200, // 2 × 5
    '36x60': 3200, // 2 × 5
    '48x60': 3200, // 2 × 5
    '30x72': 3200, // 2 × 5
    '36x72': 3200, // 2 × 5
    '48x72': 3200, // 2 × 5
    '30x84': 3200, // 2 × 5
    '36x84': 3200, // 2 × 5
    '48x84': 3200, // 2 × 5
    '30x96': 3200, // 2 × 5
    '36x96': 3200, // 2 × 5
    '48x96': 3200, // 2 × 5
    // L-Shaped tables
    'l-A': 2600, // 2 × 3
    'l-B': 2600, // 2 × 3
    'l-C': 2600, // 2 × 3
    'l-D': 2700, // 2 × 4
    'l-E': 2700, // 2 × 4
    'l-F': 2700, // 2 × 4
    'l-G': 3200, // 2 × 5
    'l-H': 3200, // 2 × 5
  };
  
  return sizeMap[size] || 2400; // Default to lowest charge if size not found
};

export function NewOrderForm() {
  const { addOrder } = useApp();
  
  const form = useFormProvider();

  const watchTables = form.watch("tables");
  const watchDeliveryFee = form.watch("deliveryFee") || 0;
  const watchAdditionalCharges = form.watch("additionalCharges") || 0;
  
  // Calculate automatic delivery fee based on tables
  const calculateAutomaticDeliveryFee = React.useMemo(() => {
    if (!watchTables || watchTables.length === 0) return 0;
    
    // Get the highest delivery charge from all tables
    const maxDeliveryCharge = Math.max(
      ...watchTables.map(table => getDeliveryChargeForSize(table.size))
    );
    
    return maxDeliveryCharge;
  }, [watchTables]);

  // Update delivery fee automatically when tables change
  useEffect(() => {
    const automaticDeliveryFee = calculateAutomaticDeliveryFee;
    if (automaticDeliveryFee !== watchDeliveryFee) {
      form.setValue("deliveryFee", automaticDeliveryFee);
    }
  }, [calculateAutomaticDeliveryFee, form, watchDeliveryFee]);
  
  // Calculate total price - multiply price by quantity for each table
  const tablesCost = React.useMemo(() => {
    return watchTables?.reduce((sum, table) => sum + (table.price * table.quantity), 0) || 0;
  }, [watchTables]);

  const totalPrice = React.useMemo(() => {
    return tablesCost + watchDeliveryFee + watchAdditionalCharges;
  }, [tablesCost, watchDeliveryFee, watchAdditionalCharges]);

  // Handle form submission
  async function onSubmit(values: OrderFormValues) {
    try {
      // Prepare order data with the tables - ensure all fields are non-optional
      const orderData = {
        customerName: values.customerName,
        address: values.address,
        contactNumber: values.contactNumber,
        tables: values.tables.map((table): TableItem => ({
          id: table.id,
          size: table.size,
          topColour: table.topColour,
          frameColour: table.frameColour,
          colour: table.colour, // For compatibility
          quantity: table.quantity,
          price: table.price,
        })),
        note: values.note || "",
        totalPrice,
        deliveryFee: values.deliveryFee || 0,
        additionalCharges: values.additionalCharges || 0
      };
      
      await addOrder(orderData);
      form.reset({
        customerName: "",
        address: "",
        contactNumber: "",
        tables: [createEmptyTable()],
        note: "",
        deliveryFee: calculateAutomaticDeliveryFee,
        additionalCharges: 0,
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
    topColour: 'white',
    frameColour: 'white',
    colour: 'white', // For compatibility
    quantity: 1,
    price: 11000  // Updated default price for 24x32 table
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

  // Format price in Sri Lankan Rupees
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
              
              <div className="mt-6 space-y-4 border-t pt-4">
                <FormField
                  control={form.control}
                  name="deliveryFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Fee (Auto-calculated)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="0" 
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || ""}
                          className="bg-gray-50"
                          readOnly
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Automatically calculated based on largest table size
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="additionalCharges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Charges</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="0" 
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4 text-right">
                  <div className="text-sm text-muted-foreground text-right">Tables Cost:</div>
                  <div>{getFormattedPrice(tablesCost)}</div>
                  
                  <div className="text-sm text-muted-foreground text-right">Delivery Fee:</div>
                  <div>{getFormattedPrice(watchDeliveryFee)}</div>
                  
                  <div className="text-sm text-muted-foreground text-right">Additional Charges:</div>
                  <div>{getFormattedPrice(watchAdditionalCharges)}</div>
                  
                  <div className="text-base font-medium text-right">Total:</div>
                  <div className="text-base font-semibold">
                    {getFormattedPrice(totalPrice)}
                  </div>
                </div>
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
          topColour: 'white',
          frameColour: 'white',
          colour: 'white', // For compatibility
          quantity: 1,
          price: 11000  // Updated default price
        }
      ],
      note: "",
      deliveryFee: 0,
      additionalCharges: 0,
    },
  });

  return form;
}

export default NewOrderForm;

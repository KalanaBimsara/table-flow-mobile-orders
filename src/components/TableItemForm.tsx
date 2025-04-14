
import React from 'react';
import { TableItem } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { tableSizeOptions, colourOptions } from '@/types/order';
import { useFormContext } from 'react-hook-form';
import { Trash2 } from 'lucide-react';

interface TableItemFormProps {
  index: number;
  onRemove: () => void;
  showRemoveButton: boolean;
}

const TableItemForm: React.FC<TableItemFormProps> = ({ index, onRemove, showRemoveButton }) => {
  const { control, watch, setValue } = useFormContext();
  const tableSize = watch(`tables.${index}.size`);
  
  // Update price when size or quantity changes
  React.useEffect(() => {
    const size = tableSize;
    const quantity = watch(`tables.${index}.quantity`) || 1;
    
    const selectedOption = tableSizeOptions.find(option => option.value === size);
    if (selectedOption) {
      const price = selectedOption.price * quantity;
      setValue(`tables.${index}.price`, price);
    }
  }, [tableSize, watch(`tables.${index}.quantity`), setValue, index]);
  
  const getFormattedPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-medium">Table {index + 1}</h3>
          {showRemoveButton && (
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={onRemove}
              className="text-destructive"
            >
              <Trash2 size={16} />
              <span className="ml-1">Remove</span>
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormField
            control={control}
            name={`tables.${index}.size`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Table Size</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-80">
                    <div className="p-2 font-semibold text-sm">Standard Tables</div>
                    {tableSizeOptions.filter(option => !option.value.startsWith('l-')).map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} - {getFormattedPrice(option.price)}
                      </SelectItem>
                    ))}
                    
                    <div className="p-2 font-semibold text-sm mt-2">L-Shaped Tables</div>
                    {tableSizeOptions.filter(option => option.value.startsWith('l-')).map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} - {getFormattedPrice(option.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name={`tables.${index}.colour`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wood/Colour</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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
        </div>
        
        <FormField
          control={control}
          name={`tables.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={1} 
                  {...field} 
                  onChange={(e) => {
                    // Ensure the value is at least 1
                    const value = parseInt(e.target.value);
                    field.onChange(Math.max(1, value || 1));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="mt-4 text-right">
          <span className="font-medium">
            Price: {getFormattedPrice(watch(`tables.${index}.price`) || 0)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TableItemForm;

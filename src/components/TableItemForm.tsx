import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { tableSizeOptions, colourOptions } from '@/types/order';
interface TableItemFormProps {
  index: number;
  onRemove: () => void;
  showRemoveButton: boolean;
}
const frameColourOptions = [{
  value: 'white',
  label: 'White'
}, {
  value: 'black',
  label: 'Black'
}];
const TableItemForm: React.FC<TableItemFormProps> = ({
  index,
  onRemove,
  showRemoveButton
}) => {
  const form = useFormContext();

  // Calculate the price based on the selected size
  const handleSizeChange = (value: string) => {
    const selectedSize = tableSizeOptions.find(option => option.value === value);
    if (selectedSize) {
      form.setValue(`tables.${index}.price`, selectedSize.price);
    }
  };
  return <div className="border p-4 rounded-md space-y-4 relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField control={form.control} name={`tables.${index}.size`} render={({
        field
      }) => <FormItem>
              <FormLabel>Size</FormLabel>
              <Select onValueChange={value => {
          field.onChange(value);
          handleSizeChange(value);
        }} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tableSizeOptions.map(option => <SelectItem key={option.value} value={option.value}>
                      {option.label} - {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'LKR',
                maximumFractionDigits: 0
              }).format(option.price)}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>} />

        <FormField control={form.control} name={`tables.${index}.quantity`} render={({
        field
      }) => <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 1)} />
              </FormControl>
              <FormMessage />
            </FormItem>} />

        <FormField control={form.control} name={`tables.${index}.topColour`} render={({
        field
      }) => <FormItem>
              <FormLabel>Top Colour</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select colour" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {colourOptions.map(option => <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>} />

        <FormField control={form.control} name={`tables.${index}.frameColour`} render={({
        field
      }) => <FormItem>
              <FormLabel>Leg Colour</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select colour" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {frameColourOptions.map(option => <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>} />
      </div>
      
      {showRemoveButton && <div className="flex justify-end mt-2">
          <Button type="button" variant="outline" size="sm" onClick={onRemove} className="flex items-center text-destructive hover:text-destructive">
            <Trash2 size={16} className="mr-1" />
            Remove Table
          </Button>
        </div>}
    </div>;
};
export default TableItemForm;
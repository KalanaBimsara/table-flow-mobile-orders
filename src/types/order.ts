
export type OrderStatus = 'pending' | 'assigned' | 'completed';

export interface Order {
  id: string;
  customerName: string;
  address: string;
  contactNumber: string;
  tableSize: string;
  colour: string;
  quantity: number;
  status: OrderStatus;
  assignedTo?: string;
  createdAt: Date;
  completedAt?: Date;
}

export const tableSizeOptions = [
  { value: 'small', label: 'Small (4 seater)' },
  { value: 'medium', label: 'Medium (6 seater)' },
  { value: 'large', label: 'Large (8 seater)' },
  { value: 'xl', label: 'Extra Large (10+ seater)' },
  { value: 'custom', label: 'Custom Size' }
];

export const colourOptions = [
  { value: 'oak', label: 'Oak' },
  { value: 'walnut', label: 'Walnut' },
  { value: 'mahogany', label: 'Mahogany' },
  { value: 'pine', label: 'Pine' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'ebony', label: 'Ebony' },
  { value: 'custom', label: 'Custom Finish' }
];

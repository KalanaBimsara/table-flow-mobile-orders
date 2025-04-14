
import { v4 as uuidv4 } from 'uuid';

export type OrderStatus = 'pending' | 'assigned' | 'completed';

export interface TableItem {
  id: string;  // Make id required
  size: string;
  colour: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  address: string;
  contactNumber: string;
  tables: TableItem[];
  note?: string;
  status: OrderStatus;
  assignedTo?: string;
  createdAt: Date;
  completedAt?: Date;
  totalPrice?: number;
}

export const tableSizeOptions = [
  // Standard sizes
  { value: '24x32', label: '24" x 32"', price: 10500 },
  { value: '24x36', label: '24" x 36"', price: 11500 },
  { value: '24x48', label: '24" x 48"', price: 13500 },
  { value: '24x60', label: '24" x 60"', price: 15000 },
  { value: '24x72', label: '24" x 72"', price: 19500 },
  { value: '24x84', label: '24" x 84"', price: 22000 },
  { value: '24x96', label: '24" x 96"', price: 22000 },
  { value: '30x48', label: '30" x 48"', price: 22000 },
  { value: '36x48', label: '36" x 48"', price: 22000 },
  { value: '48x48', label: '48" x 48"', price: 22000 },
  { value: '30x60', label: '30" x 60"', price: 26000 },
  { value: '36x60', label: '36" x 60"', price: 26000 },
  { value: '48x60', label: '48" x 60"', price: 26000 },
  { value: '30x72', label: '30" x 72"', price: 34000 },
  { value: '36x72', label: '36" x 72"', price: 34000 },
  { value: '48x72', label: '48" x 72"', price: 34000 },
  { value: '30x84', label: '30" x 84"', price: 39000 },
  { value: '36x84', label: '36" x 84"', price: 39000 },
  { value: '48x84', label: '48" x 84"', price: 39000 },
  { value: '30x96', label: '30" x 96"', price: 39000 },
  { value: '36x96', label: '36" x 96"', price: 39000 },
  { value: '48x96', label: '48" x 96"', price: 39000 },
  // L-Shaped options
  { value: 'l-a', label: 'L-Shaped Size A', price: 21000 },
  { value: 'l-b', label: 'L-Shaped Size B', price: 22000 },
  { value: 'l-c', label: 'L-Shaped Size C', price: 22000 },
  { value: 'l-d', label: 'L-Shaped Size D', price: 24000 },
  { value: 'l-e', label: 'L-Shaped Size E', price: 23000 },
  { value: 'l-f', label: 'L-Shaped Size F', price: 24000 },
  { value: 'l-g', label: 'L-Shaped Size G', price: 24000 },
  { value: 'l-h', label: 'L-Shaped Size H', price: 26000 },
  { value: 'custom', label: 'Custom Size', price: 0 }
];

export const colourOptions = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
  { value: 'american-ash-white', label: 'American Ash White' },
  { value: 'jungle-teak', label: 'Jungle Teak' },
  { value: 'custom', label: 'Custom Finish' }
];


export type TableItem = {
  id: string,
  size: string,
  topColour: string,
  frameColour: string, 
  colour: string,  // Keeping for backward compatibility
  quantity: number,
  price: number
};

export type OrderStatus = 'pending' | 'assigned' | 'completed';

export type UserRole = 'admin' | 'delivery' | 'customer';

export type Order = {
  id: string,
  customerName: string,
  address: string,
  contactNumber: string,
  tables: TableItem[],
  note?: string,
  status: OrderStatus,
  createdAt: Date,
  completedAt?: Date,
  totalPrice: number,
  deliveryFee?: number,
  additionalCharges?: number,
  assignedTo?: string,
  delivery_person_id?: string,  // Added to match database column name
  createdBy?: string
};

export const tableSizeOptions = [
  // Standard Tables
  { value: '24x32', label: '24x32 Table', price: 10500 },
  { value: '24x36', label: '24x36 Table', price: 11500 },
  { value: '24x48', label: '24x48 Table', price: 13500 },
  { value: '24x60', label: '24x60 Table', price: 15000 },
  { value: '24x72', label: '24x72 Table', price: 19500 },
  { value: '24x84', label: '24x84 Table', price: 22000 },
  { value: '24x96', label: '24x96 Table', price: 22000 },

  // Medium Tables
  { value: '30x48', label: '30x48 Table', price: 22000 },
  { value: '36x48', label: '36x48 Table', price: 22000 },
  { value: '48x48', label: '48x48 Table', price: 22000 },

  // Large Tables
  { value: '30x60', label: '30x60 Table', price: 26000 },
  { value: '36x60', label: '36x60 Table', price: 26000 },
  { value: '48x60', label: '48x60 Table', price: 26000 },

  // Extra Large Tables
  { value: '30x72', label: '30x72 Table', price: 34000 },
  { value: '36x72', label: '36x72 Table', price: 34000 },
  { value: '48x72', label: '48x72 Table', price: 34000 },

  // Jumbo Tables
  { value: '30x84', label: '30x84 Table', price: 39000 },
  { value: '36x84', label: '36x84 Table', price: 39000 },
  { value: '48x84', label: '48x84 Table', price: 39000 },
  { value: '30x96', label: '30x96 Table', price: 39000 },
  { value: '36x96', label: '36x96 Table', price: 39000 },
  { value: '48x96', label: '48x96 Table', price: 39000 },

  // L-Shaped Tables
  { value: 'l-A', label: 'L-Shaped Table (Size A)', price: 21000 },
  { value: 'l-B', label: 'L-Shaped Table (Size B)', price: 22000 },
  { value: 'l-C', label: 'L-Shaped Table (Size C)', price: 22000 },
  { value: 'l-D', label: 'L-Shaped Table (Size D)', price: 24000 },
  { value: 'l-E', label: 'L-Shaped Table (Size E)', price: 23000 },
  { value: 'l-F', label: 'L-Shaped Table (Size F)', price: 24000 },
  { value: 'l-G', label: 'L-Shaped Table (Size G)', price: 24000 },
  { value: 'l-H', label: 'L-Shaped Table (Size H)', price: 26000 }
];

export const colourOptions = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
  { value: 'ash_white', label: 'American Ash White' },
  { value: 'teak', label: 'Jungle Teak' }
];

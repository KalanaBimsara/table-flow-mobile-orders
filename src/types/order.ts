
export type TableItem = {
  id: string,
  size: string,
  colour: string,
  quantity: number,
  price: number
};

export type OrderStatus = 'pending' | 'assigned' | 'completed';

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
  assignedTo?: string
};

export const tableSizeOptions = [
  { value: '24x32', label: '24x32 Table', price: 10500 },
  { value: '30x40', label: '30x40 Table', price: 15000 },
  { value: 'l-24x32', label: 'L-Shaped 24x32 Table', price: 15000 },
  { value: 'l-30x40', label: 'L-Shaped 30x40 Table', price: 20000 }
];

export const colourOptions = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
  { value: 'oak', label: 'Oak' },
  { value: 'cherry', label: 'Cherry Wood' }
];


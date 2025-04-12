
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types/order';

export type OrderInput = Omit<Order, 'id' | 'status' | 'createdAt' | 'completedAt' | 'assignedTo'>;

export const OrderService = {
  async getOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    return data.map(order => ({
      id: order.id,
      customerName: order.customer_name,
      address: order.address,
      contactNumber: order.contact_number,
      tableSize: order.table_size,
      colour: order.colour,
      quantity: order.quantity,
      status: order.status,
      assignedTo: order.delivery_person_id ? 'Assigned' : undefined,
      createdAt: new Date(order.created_at),
      completedAt: order.completed_at ? new Date(order.completed_at) : undefined
    }));
  },

  async addOrder(orderData: OrderInput, customerId?: string): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        customer_name: orderData.customerName,
        address: orderData.address,
        contact_number: orderData.contactNumber,
        table_size: orderData.tableSize,
        colour: orderData.colour,
        quantity: orderData.quantity,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding order:', error);
      throw error;
    }

    return {
      id: data.id,
      customerName: data.customer_name,
      address: data.address,
      contactNumber: data.contact_number,
      tableSize: data.table_size,
      colour: data.colour,
      quantity: data.quantity,
      status: data.status,
      createdAt: new Date(data.created_at)
    };
  },

  async assignOrder(orderId: string, deliveryPersonId: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'assigned',
        delivery_person_id: deliveryPersonId
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error assigning order:', error);
      throw error;
    }
  },

  async completeOrder(orderId: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error completing order:', error);
      throw error;
    }
  }
};

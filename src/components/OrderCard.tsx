
import React from 'react';
import { format } from 'date-fns';
import { MapPin, Phone, Package, Palette, Hash, Calendar, CheckCircle2, Truck, StickyNote, Table } from 'lucide-react';
import { Order, TableItem, tableSizeOptions, colourOptions } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type OrderCardProps = {
  order: Order;
};

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const { userRole, assignOrder, completeOrder } = useApp();
  const { user } = useAuth();
  
  const handleAssignOrder = () => {
    if (!user) {
      toast.error("You must be logged in to assign orders");
      return;
    }
    
    assignOrder(order.id, user.id);
  };
  
  const handleCompleteOrder = () => {
    completeOrder(order.id);
  };

  const getTableSizeLabel = (value: string) => {
    const option = tableSizeOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const getColourLabel = (value: string) => {
    const option = colourOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const getStatusBadge = () => {
    switch (order.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'assigned':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Assigned</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return null;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Card className={`order-card ${
      order.status === 'pending' ? 'order-pending' : 
      order.status === 'assigned' ? 'order-assigned' : 
      'order-completed'
    } text-lg`}>
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-2xl font-bold">{order.customerName}</h3>
          {getStatusBadge()}
        </div>

        <div className="space-y-3 text-base">
          <div className="flex items-center gap-3">
            <MapPin size={24} className="flex-shrink-0 text-muted-foreground" />
            <span className="font-medium">{order.address}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Phone size={24} className="flex-shrink-0 text-muted-foreground" />
            <span className="font-medium">{order.contactNumber}</span>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-3">
              <Table size={24} className="flex-shrink-0 text-muted-foreground" />
              <span className="text-xl font-bold">Table Details</span>
            </div>
            
            <div className="space-y-3">
              {order.tables && order.tables.length > 0 ? (
                order.tables.map((table, index) => (
                  <div key={table.id || index} className="border p-4 rounded-lg bg-gray-50">
                    <div className="grid grid-cols-2 gap-y-2 text-base">
                      <div className="flex items-center gap-2">
                        <Package size={18} className="flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium">Size: {getTableSizeLabel(table.size)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Palette size={18} className="flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium">Colour: {getColourLabel(table.colour)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Hash size={18} className="flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium">Quantity: {table.quantity} {table.quantity > 1 ? 'tables' : 'table'}</span>
                      </div>
                      
                      <div className="text-right text-lg font-bold">
                        Price: {formatPrice(table.price)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-base">No table details available.</p>
              )}
              
              <div className="text-right text-xl font-bold pt-2 border-t">
                Total Price: {formatPrice(order.totalPrice || 0)}
              </div>
            </div>
          </div>
          
          {order.note && (
            <div className="flex items-center gap-3 mt-3">
              <StickyNote size={24} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium">{order.note}</span>
            </div>
          )}
          
          <div className="flex items-center gap-3 mt-3">
            <Calendar size={24} className="flex-shrink-0 text-muted-foreground" />
            <span className="font-medium">Created: {format(new Date(order.createdAt), 'MMM d, yyyy')}</span>
          </div>
          
          {order.status === 'assigned' && (
            <div className="flex items-center gap-3 mt-3">
              <Truck size={24} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium">Assigned to delivery</span>
            </div>
          )}
          
          {order.status === 'completed' && order.completedAt && (
            <div className="flex items-center gap-3 mt-3">
              <CheckCircle2 size={24} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium">Completed: {format(new Date(order.completedAt), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end gap-3">
        {userRole === 'admin' && order.status === 'pending' && (
          <Button 
            size="lg" 
            variant="outline"
            onClick={handleAssignOrder}
            className="text-base"
          >
            Assign to Delivery
          </Button>
        )}
        
        {((userRole === 'admin' && order.status === 'assigned') || 
         (userRole === 'delivery' && order.status === 'assigned')) && (
          <Button 
            size="lg" 
            variant="default"
            onClick={handleCompleteOrder}
            className="text-base"
          >
            Mark Complete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default OrderCard;

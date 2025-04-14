
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
    
    // Here we use the current user's ID instead of a string like "Driver 1"
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

  // Format price in Indian Rupees
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
    }`}>
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-medium">{order.customerName}</h3>
          {getStatusBadge()}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="mt-1 flex-shrink-0 text-muted-foreground" />
            <span className="whitespace-pre-line">{order.address}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Phone size={16} className="flex-shrink-0 text-muted-foreground" />
            <span>{order.contactNumber}</span>
          </div>
          
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <Table size={16} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium">Tables ({order.tables?.length || 0})</span>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="tables">
                <AccordionTrigger className="py-2 text-sm">View Tables</AccordionTrigger>
                <AccordionContent>
                  {order.tables && order.tables.length > 0 ? (
                    <div className="space-y-3">
                      {order.tables.map((table, index) => (
                        <div key={table.id || index} className="border p-3 rounded-md">
                          <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Package size={14} className="flex-shrink-0 text-muted-foreground" />
                              <span>{getTableSizeLabel(table.size)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Palette size={14} className="flex-shrink-0 text-muted-foreground" />
                              <span>{getColourLabel(table.colour)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Hash size={14} className="flex-shrink-0 text-muted-foreground" />
                              <span>{table.quantity} {table.quantity > 1 ? 'tables' : 'table'}</span>
                            </div>
                            
                            <div className="text-right font-medium">
                              {formatPrice(table.price)}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="text-right font-semibold pt-2 border-t">
                        Total: {formatPrice(order.totalPrice || 0)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No table details available.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          {order.note && (
            <div className="flex items-start gap-2 mt-2">
              <StickyNote size={16} className="mt-1 flex-shrink-0 text-muted-foreground" />
              <span className="whitespace-pre-line">{order.note}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-2">
            <Calendar size={16} className="flex-shrink-0 text-muted-foreground" />
            <span>Created: {format(new Date(order.createdAt), 'MMM d, yyyy')}</span>
          </div>
          
          {order.status === 'assigned' && (
            <div className="flex items-center gap-2">
              <Truck size={16} className="flex-shrink-0 text-muted-foreground" />
              <span>Assigned to delivery person</span>
            </div>
          )}
          
          {order.status === 'completed' && order.completedAt && (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="flex-shrink-0 text-muted-foreground" />
              <span>Completed: {format(new Date(order.completedAt), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end gap-2">
        {userRole === 'admin' && order.status === 'pending' && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleAssignOrder}
          >
            Assign to Delivery
          </Button>
        )}
        
        {((userRole === 'admin' && order.status === 'assigned') || 
         (userRole === 'delivery' && order.status === 'assigned')) && (
          <Button 
            size="sm" 
            variant="default"
            onClick={handleCompleteOrder}
          >
            Mark Complete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default OrderCard;

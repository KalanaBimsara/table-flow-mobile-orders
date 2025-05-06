import React from 'react';
import { format } from 'date-fns';
import { MapPin, Phone, Package, Palette, Hash, Calendar, CheckCircle2, Truck, StickyNote, Table, Trash2, DollarSign, User } from 'lucide-react';
import { Order, TableItem, tableSizeOptions, colourOptions } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type OrderCardProps = {
  order: Order;
  onComplete?: () => void;
  actionButton?: React.ReactNode;
};

const OrderCard: React.FC<OrderCardProps> = ({ order, onComplete, actionButton }) => {
  const { userRole, assignOrder, completeOrder, deleteOrder, getDeliveryPersonName } = useApp();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Get delivery person name if assigned
  const deliveryPersonName = order.assignedTo ? getDeliveryPersonName(order.assignedTo) : null;
  
  const handleAssignOrder = () => {
    if (!user) {
      toast.error("You must be logged in to assign orders");
      return;
    }
    
    assignOrder(order.id, user.id);
  };
  
  const handleCompleteOrder = () => {
    if (onComplete) {
      onComplete();
    } else {
      completeOrder(order.id);
    }
  };

  const handleDeleteOrder = () => {
    deleteOrder(order.id);
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
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-sm md:text-base px-2 md:px-3 py-1">Pending</Badge>;
      case 'assigned':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 text-sm md:text-base px-2 md:px-3 py-1">Assigned</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 text-sm md:text-base px-2 md:px-3 py-1">Completed</Badge>;
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
    } ${isMobile ? 'text-base' : 'text-lg'}`}>
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
          <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{order.customerName}</h3>
          {getStatusBadge()}
        </div>

        <div className="space-y-3 text-sm sm:text-base">
          <div className="flex items-center gap-2">
            <MapPin size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
            <span className="font-medium break-words break-all whitespace-normal">
              {order.address}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Phone size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
            <a href={`tel:${order.contactNumber}`} className="font-medium text-blue-600 hover:underline">
              {order.contactNumber}
            </a>
          </div>
          
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <Table size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
              <span className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>Table Details</span>
            </div>
            
            <div className="space-y-3">
              {order.tables && order.tables.length > 0 ? (
                order.tables.map((table, index) => (
                  <div key={table.id || index} className="border p-2 md:p-4 rounded-lg bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm md:text-base">
                      <div className="flex items-center gap-2">
                        <Package size={isMobile ? 16 : 20} className="flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium">Size: {getTableSizeLabel(table.size)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Palette size={isMobile ? 16 : 20} className="flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium">Top Colour: {getColourLabel(table.topColour)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Palette size={isMobile ? 16 : 20} className="flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium">Frame Colour: {getColourLabel(table.frameColour)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Hash size={isMobile ? 16 : 20} className="flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium">Quantity: {table.quantity} {table.quantity > 1 ? 'tables' : 'table'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm md:text-base">No table details available.</p>
              )}
              
              <div className="flex justify-end items-center gap-2 pt-3 border-t">
                <DollarSign size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
                <span className="text-lg font-bold">Total: {formatPrice(order.totalPrice || 0)}</span>
              </div>
            </div>
          </div>
          
          {order.note && (
            <div className="flex items-center gap-2 mt-3">
              <StickyNote size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium break-words">{order.note}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-3">
            <Calendar size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
            <span className="font-medium">Created: {format(new Date(order.createdAt), 'MMM d, yyyy')}</span>
          </div>
          
          {(order.status === 'assigned' || order.status === 'completed') && order.assignedTo && (
            <div className="flex items-center gap-2 mt-3">
              <User size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium">
                Assigned to: {deliveryPersonName || "Unknown Delivery Person"}
              </span>
            </div>
          )}
          
          {order.status === 'assigned' && !order.assignedTo && (
            <div className="flex items-center gap-2 mt-3">
              <Truck size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium">Assigned to delivery</span>
            </div>
          )}
          
          {order.status === 'completed' && order.completedAt && (
            <div className="flex items-center gap-2 mt-3">
              <CheckCircle2 size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium">Completed: {format(new Date(order.completedAt), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className={`flex flex-wrap gap-2 ${isMobile ? 'justify-center' : 'justify-end'}`}>
        {userRole === 'admin' && order.status === 'pending' && (
          <Button 
            size={isMobile ? "sm" : "default"} 
            variant="outline"
            onClick={handleAssignOrder}
            className={`${isMobile ? 'text-sm w-full sm:w-auto' : 'text-base'}`}
          >
            Assign to Delivery
          </Button>
        )}
        
        {((userRole === 'admin' && order.status === 'assigned') || 
         (userRole === 'delivery' && order.status === 'assigned')) && (
          <Button 
            size={isMobile ? "sm" : "default"} 
            variant="default"
            onClick={handleCompleteOrder}
            className={`${isMobile ? 'text-sm w-full sm:w-auto' : 'text-base'}`}
          >
            Mark Complete
          </Button>
        )}

        {actionButton && (
          <div className="w-full sm:w-auto">{actionButton}</div>
        )}
        
        {userRole === 'admin' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                size={isMobile ? "sm" : "default"} 
                variant="destructive"
                className={`${isMobile ? 'text-sm w-full sm:w-auto' : 'text-base'} btn-delete-faded`}
              >
                <Trash2 size={isMobile ? 14 : 18} className="mr-1" />
                Delete Order
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the order from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteOrder}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
};

export default OrderCard;

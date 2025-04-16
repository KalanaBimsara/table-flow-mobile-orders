
import React from 'react';
import { format } from 'date-fns';
import { MapPin, Phone, Package, Calendar } from 'lucide-react';
import { Order } from '@/types/order';
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
  const { completeOrder } = useApp();
  const { userRole } = useAuth();
  
  const handleCompleteOrder = () => {
    completeOrder(order.id);
  };

  return (
    <Card className="border-2">
      <CardContent className="pt-6 space-y-6">
        {/* Customer Information */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-primary">{order.customerName}</h3>
          
          <div className="flex items-start gap-3 text-lg">
            <MapPin size={24} className="mt-1 flex-shrink-0 text-blue-600" />
            <span className="font-medium">{order.address}</span>
          </div>
          
          <div className="flex items-center gap-3 text-lg">
            <Phone size={24} className="flex-shrink-0 text-green-600" />
            <span className="font-medium">{order.contactNumber}</span>
          </div>
        </div>

        {/* Order Details */}
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Package size={24} className="flex-shrink-0 text-purple-600" />
            <span className="text-lg font-medium">
              Total Items: {order.tables?.reduce((sum, table) => sum + table.quantity, 0) || 0} tables
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Calendar size={24} className="flex-shrink-0 text-orange-600" />
            <span className="text-lg">
              Order Date: {format(new Date(order.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        {/* Note Section - Only show if there's a note */}
        {order.note && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-lg font-medium">Note:</p>
            <p className="text-lg mt-2">{order.note}</p>
          </div>
        )}
      </CardContent>

      {userRole === 'delivery' && order.status === 'assigned' && (
        <CardFooter className="pt-4">
          <Button 
            size="lg"
            className="w-full text-lg py-6"
            onClick={handleCompleteOrder}
          >
            Mark as Delivered
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default OrderCard;

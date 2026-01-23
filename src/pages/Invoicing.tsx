import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Printer, FileText, Plus, X, Truck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Order, TableItem, tableSizeOptions } from '@/types/order';
import { format } from 'date-fns';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';
import InvoiceBillTemplate, { calculateExtraFees } from '@/components/invoicing/InvoiceBillTemplate';

const TRANSPORT_MODES = [
  { value: 'vehicle_1', label: 'Vehicle Number 1' },
  { value: 'vehicle_2', label: 'Vehicle Number 2' },
  { value: 'vehicle_3', label: 'Vehicle Number 3' },
  { value: 'vehicle_4', label: 'Vehicle Number 4' },
  { value: 'pick_me', label: 'Pick Me' },
  { value: 'factory_pickup', label: 'Factory Pick Up' },
];

const MAX_ROWS_PER_BILL = 10;

interface BillRow {
  quantity: number;
  item: string;
  orderNumber: string;
  deliveryCity: string;
  rate: number;
  amount: number;
  isExtraFee?: boolean;
}

const Invoicing: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoiceDate] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [billNumber, setBillNumber] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);

  // Fetch delivery drivers on mount
  useEffect(() => {
    const fetchDrivers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'delivery');
      
      if (!error && data) {
        setDrivers(data.filter(d => d.name));
      }
    };
    fetchDrivers();
  }, []);

  const addOrder = async () => {
    if (!orderNumber.trim()) {
      toast.error('Please enter an order number');
      return;
    }

    // Check if already added
    if (orders.some(o => o.order_form_number === orderNumber.trim())) {
      toast.error('Order already added');
      return;
    }

    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_form_number', orderNumber.trim())
        .maybeSingle();

      if (orderError) throw orderError;

      if (!orderData) {
        toast.error('Order not found');
        return;
      }

      const { data: tablesData, error: tablesError } = await supabase
        .from('order_tables')
        .select('*')
        .eq('order_id', orderData.id);

      if (tablesError) throw tablesError;

      const mappedOrder: Order = {
        id: orderData.id,
        order_form_number: orderData.order_form_number,
        customerName: orderData.customer_name,
        customerDistrict: orderData.customer_district,
        address: orderData.address,
        contactNumber: orderData.contact_number,
        note: orderData.note || '',
        status: orderData.status as Order['status'],
        createdAt: new Date(orderData.created_at),
        totalPrice: Number(orderData.price),
        deliveryFee: Number(orderData.delivery_fee) || 0,
        additionalCharges: Number(orderData.additional_charges) || 0,
        deliveryDate: orderData.delivery_date,
        deliveryType: orderData.delivery_type as Order['deliveryType'],
        salesPersonName: orderData.sales_person_name,
        tables: (tablesData || []).map((t: any) => ({
          id: t.id,
          size: t.size,
          topColour: t.top_colour || t.colour,
          frameColour: t.frame_colour || t.colour,
          colour: t.colour,
          quantity: t.quantity,
          price: Number(t.price),
          legSize: t.leg_size,
          legShape: t.leg_shape,
          legHeight: t.leg_height,
          wireHoles: t.wire_holes,
          wireHolesComment: t.wire_holes_comment,
          frontPanelSize: t.front_panel_size,
          frontPanelLength: t.front_panel_length ? Number(t.front_panel_length) : undefined,
          lShapeOrientation: t.l_shape_orientation
        }))
      };

      setOrders(prev => [...prev, mappedOrder]);
      setOrderNumber('');
      toast.success(`Order ${mappedOrder.order_form_number} added`);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  const removeOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // Generate all bill rows from orders
  const generateBillRows = (): BillRow[] => {
    const rows: BillRow[] = [];

    orders.forEach(order => {
      order.tables.forEach(table => {
        const { extraFee, feeDetails } = calculateExtraFees(table);
        const itemAmount = table.price * table.quantity;

        // Main item row
        rows.push({
          quantity: table.quantity,
          item: table.size,
          orderNumber: order.order_form_number || '',
          deliveryCity: order.customerDistrict || '',
          rate: table.price,
          amount: itemAmount
        });

        // Extra fee rows
        feeDetails.forEach(detail => {
          rows.push({
            quantity: table.quantity,
            item: detail,
            orderNumber: order.order_form_number || '',
            deliveryCity: '',
            rate: 1000,
            amount: 1000 * table.quantity,
            isExtraFee: true
          });
        });
      });
    });

    return rows;
  };

  // Split rows into pages of max 10 rows each
  const generateBillPages = () => {
    const allRows = generateBillRows();
    const pages: BillRow[][] = [];

    for (let i = 0; i < allRows.length; i += MAX_ROWS_PER_BILL) {
      pages.push(allRows.slice(i, i + MAX_ROWS_PER_BILL));
    }

    return pages.length > 0 ? pages : [[]];
  };

  // Calculate totals
  const calculateTotals = () => {
    const rows = generateBillRows();
    let totalAmount = 0;
    let totalQuantity = 0;

    rows.forEach(row => {
      totalAmount += row.amount;
      if (!row.isExtraFee) {
        totalQuantity += row.quantity;
      }
    });

    // Add delivery fees and additional charges from all orders
    orders.forEach(order => {
      totalAmount += (order.deliveryFee || 0) + (order.additionalCharges || 0);
    });

    return { totalAmount, totalQuantity };
  };

  const handlePrint = () => {
    if (!billNumber.trim()) {
      toast.error('Please enter a bill number');
      return;
    }
    window.print();
  };

  const handleDownload = async () => {
    if (!billNumber.trim()) {
      toast.error('Please enter a bill number');
      return;
    }

    const invoiceContent = document.getElementById('invoice-content');
    if (invoiceContent) {
      const opt = {
        margin: 0.3,
        filename: `Bill-${billNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      try {
        await html2pdf().set(opt).from(invoiceContent).save();
        toast.success('Bill downloaded successfully!');
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to download bill');
      }
    }
  };

  const billPages = generateBillPages();
  const totals = calculateTotals();
  const orderNumbers = orders.map(o => o.order_form_number || '').filter(Boolean);
  const driverName = drivers.find(d => d.id === selectedDriver)?.name;
  const vehicleLabel = TRANSPORT_MODES.find(m => m.value === selectedVehicle)?.label;

  // Get customer info from first order
  const customerInfo = orders.length > 0 ? {
    name: orders.map(o => o.customerName).join(' / '),
    address: orders[0].address,
    contact: orders[0].contactNumber,
    district: orders[0].customerDistrict || ''
  } : {
    name: '',
    address: '',
    contact: '',
    district: ''
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto mb-8 no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Invoice / Bill Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bill Number */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="billNumber">Bill Number *</Label>
              <Input
                id="billNumber"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="Enter bill number"
              />
            </div>
            <div>
              <Label>Driver Name</Label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vehicle Number</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPORT_MODES.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Add Orders */}
          <div>
            <Label htmlFor="orderNumber">Add Order Numbers</Label>
            <div className="flex gap-2">
              <Input
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Enter order number (e.g., 839)"
                onKeyDown={(e) => e.key === 'Enter' && addOrder()}
              />
              <Button onClick={addOrder} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {loading ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>

          {/* Added Orders */}
          {orders.length > 0 && (
            <div>
              <Label className="mb-2 block">Added Orders ({orders.length})</Label>
              <div className="flex flex-wrap gap-2">
                {orders.map(order => (
                  <Badge key={order.id} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-2">
                    Order #{order.order_form_number} - {order.customerName}
                    <button
                      onClick={() => removeOrder(order.id)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total items: {totals.totalQuantity} | Total amount: LKR {totals.totalAmount.toLocaleString()}
                {billPages.length > 1 && ` | Will generate ${billPages.length} bill pages`}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {orders.length > 0 && (
            <div className="flex gap-4">
              <Button onClick={handlePrint} variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button onClick={handleDownload} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Preview */}
      {orders.length > 0 && billNumber && (
        <div id="invoice-content" className="max-w-4xl mx-auto">
          {billPages.map((pageRows, pageIndex) => (
            <InvoiceBillTemplate
              key={pageIndex}
              billNumber={billNumber}
              orderNumbers={orderNumbers}
              rows={pageRows}
              pageNumber={pageIndex + 1}
              totalPages={billPages.length}
              driverName={driverName}
              vehicleNumber={vehicleLabel}
              totalAmount={totals.totalAmount}
              totalQuantity={totals.totalQuantity}
              invoiceDate={invoiceDate}
              customerInfo={customerInfo}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Invoicing;

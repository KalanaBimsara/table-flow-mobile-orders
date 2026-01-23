import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Download, Printer, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Order, TableItem, tableSizeOptions, factoryPriceMap } from '@/types/order';
import { format } from 'date-fns';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';

// Standard sizes that don't incur extra fee
const standardSizes = [
  '24x32', '24x36', '24x48', '24x60', '24x72', '24x84', '24x96',
  '30x48', '36x48', '48x48',
  '30x60', '36x60', '48x60',
  '30x72', '36x72', '48x72',
  '30x84', '36x84', '48x84',
  '30x96', '36x96', '48x96',
  'DS (36x36)', 'DL (60x36)',
  'L-A', 'L-B', 'L-C', 'L-D', 'L-E', 'L-F', 'L-G', 'L-H'
];

// Calculate if size is non-standard and needs +1000 LKR fee
const isNonStandardSize = (size: string): boolean => {
  return !standardSizes.includes(size);
};

// Calculate front panel fee (+1000 LKR if front panel exists)
const hasFrontPanel = (table: TableItem): boolean => {
  return !!table.frontPanelSize && !!table.frontPanelLength && table.frontPanelLength > 0;
};

const Invoicing: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoiceDate] = useState(format(new Date(), 'dd/MM/yyyy'));

  const searchOrder = async () => {
    if (!orderNumber.trim()) {
      toast.error('Please enter an order number');
      return;
    }

    setLoading(true);
    try {
      // Fetch order by order_form_number
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_form_number', orderNumber.trim())
        .maybeSingle();

      if (orderError) throw orderError;

      if (!orderData) {
        toast.error('Order not found');
        setOrder(null);
        return;
      }

      // Fetch order tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('order_tables')
        .select('*')
        .eq('order_id', orderData.id);

      if (tablesError) throw tablesError;

      // Map to Order type
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

      setOrder(mappedOrder);
      toast.success('Order found');
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US');
  };

  const getTableSizeLabel = (size: string) => {
    const option = tableSizeOptions.find(opt => opt.value === size);
    return option ? size : size;
  };

  // Calculate extra fees for a table item
  const calculateExtraFees = (table: TableItem) => {
    let extraFee = 0;
    let feeDetails: string[] = [];

    // Non-standard size fee (+1000)
    if (isNonStandardSize(table.size)) {
      extraFee += 1000;
      feeDetails.push('C/W');
    }

    // Front panel fee (+1000)
    if (hasFrontPanel(table)) {
      extraFee += 1000;
      feeDetails.push('Panel');
    }

    return { extraFee, feeDetails };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const invoiceContent = document.getElementById('invoice-content');
    if (invoiceContent) {
      const opt = {
        margin: 0.3,
        filename: `Invoice-${order?.order_form_number || 'unknown'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      try {
        await html2pdf().set(opt).from(invoiceContent).save();
        toast.success('Invoice downloaded successfully!');
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to download invoice');
      }
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!order) return { subtotal: 0, extraFees: 0, total: 0 };

    let subtotal = 0;
    let totalExtraFees = 0;

    order.tables.forEach(table => {
      subtotal += table.price * table.quantity;
      const { extraFee } = calculateExtraFees(table);
      totalExtraFees += extraFee * table.quantity;
    });

    const total = subtotal + totalExtraFees + (order.deliveryFee || 0) + (order.additionalCharges || 0);

    return { subtotal, extraFees: totalExtraFees, total };
  };

  const totals = calculateTotals();

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto mb-8 no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Invoice Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="orderNumber">Order Number</Label>
              <Input
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Enter order number (e.g., 839)"
                onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
              />
            </div>
            <Button onClick={searchOrder} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {order && (
        <>
          {/* Action buttons */}
          <div className="flex gap-4 mb-6 no-print max-w-4xl mx-auto">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleDownload} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>

          {/* Invoice Template matching the uploaded image */}
          <div id="invoice-content" className="max-w-4xl mx-auto bg-white print:shadow-none">
            {/* Green Header */}
            <div className="bg-[#2d5a27] text-white p-4 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold tracking-wide">FURNITURE</div>
                <div className="text-xs opacity-80">PRIVATE LIMITED</div>
              </div>
              <div className="text-right text-xs">
                <p>No.31/A/02, Gammanpila, Bandaragama.</p>
                <p>Tel. 075 166 3775 / 078 844 3776</p>
              </div>
            </div>

            {/* Customer Info Section */}
            <div className="border border-gray-300 p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex gap-2 mb-2">
                    <span className="text-gray-600">Customer Name :</span>
                    <span className="border-b border-dotted border-gray-400 flex-1 font-medium">
                      {order.customerName}
                    </span>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <span className="text-gray-600">Address :</span>
                    <span className="border-b border-dotted border-gray-400 flex-1">
                      {order.address}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-600">Contact :</span>
                    <span className="border-b border-dotted border-gray-400 flex-1">
                      {order.contactNumber}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex gap-2 justify-end mb-2">
                    <span className="text-gray-600">Date :</span>
                    <span className="font-medium">{invoiceDate}</span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <span className="text-gray-600">No :</span>
                    <span className="font-bold text-lg text-blue-800">{order.order_form_number}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse border border-gray-300 mt-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left w-16">Qty</th>
                    <th className="border border-gray-300 p-2 text-left">Item</th>
                    <th className="border border-gray-300 p-2 text-center w-20">Order No</th>
                    <th className="border border-gray-300 p-2 text-left">Delivery City</th>
                    <th className="border border-gray-300 p-2 text-right w-20">Rate</th>
                    <th className="border border-gray-300 p-2 text-right w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.tables.map((table, index) => {
                    const { extraFee, feeDetails } = calculateExtraFees(table);
                    const itemAmount = table.price * table.quantity;
                    
                    return (
                      <React.Fragment key={table.id || index}>
                        <tr>
                          <td className="border border-gray-300 p-2 text-center">{String(table.quantity).padStart(2, '0')}</td>
                          <td className="border border-gray-300 p-2 font-medium">{getTableSizeLabel(table.size)}</td>
                          <td className="border border-gray-300 p-2 text-center">{order.order_form_number}</td>
                          <td className="border border-gray-300 p-2">{order.customerDistrict || ''}</td>
                          <td className="border border-gray-300 p-2 text-right"></td>
                          <td className="border border-gray-300 p-2 text-right font-medium">{formatPrice(itemAmount)}</td>
                        </tr>
                        {/* Show extra fees as separate line items if applicable */}
                        {extraFee > 0 && feeDetails.map((detail, idx) => (
                          <tr key={`${table.id}-fee-${idx}`}>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-gray-600 pl-6">{detail}</td>
                            <td className="border border-gray-300 p-2"></td>
                            <td className="border border-gray-300 p-2"></td>
                            <td className="border border-gray-300 p-2"></td>
                            <td className="border border-gray-300 p-2 text-right">{formatPrice(1000 * table.quantity)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Empty rows for visual consistency */}
                  {Array.from({ length: Math.max(0, 5 - order.tables.length) }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td className="border border-gray-300 p-2">&nbsp;</td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                    </tr>
                  ))}

                  {/* Total row */}
                  <tr className="border-t-2 border-gray-400">
                    <td className="border border-gray-300 p-2 font-bold text-center">
                      {order.tables.reduce((sum, t) => sum + t.quantity, 0)}
                    </td>
                    <td className="border border-gray-300 p-2"></td>
                    <td className="border border-gray-300 p-2"></td>
                    <td className="border border-gray-300 p-2 font-bold text-right">TOTAL</td>
                    <td className="border border-gray-300 p-2"></td>
                    <td className="border border-gray-300 p-2 text-right font-bold text-lg">
                      {formatPrice(totals.total)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signature Section */}
              <div className="grid grid-cols-3 gap-8 mt-8 pt-4">
                <div className="text-center">
                  <div className="border-t border-gray-400 pt-2">
                    <span className="text-sm text-gray-600">Prepared by</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-400 pt-2">
                    <span className="text-sm text-gray-600">Checked by</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-400 pt-2">
                    <span className="text-sm text-gray-600">Received by</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-300 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span>✉</span>
                  <span>bossfurniturelk@gmail.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🌐</span>
                  <span>www.tablelk.com</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Invoicing;

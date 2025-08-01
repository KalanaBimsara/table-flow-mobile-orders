import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Download, Printer } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Order, colourOptions, tableSizeOptions } from '@/types/order';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Invoice: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { orders } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (orderId) {
      const foundOrder = orders.find(o => o.id === orderId);
      if (foundOrder) {
        setOrder(foundOrder);
        // Auto-generate invoice number
        setInvoiceNumber(`INV-${foundOrder.id.slice(0, 8).toUpperCase()}`);
      } else {
        toast.error('Order not found');
        navigate('/history');
      }
    }
  }, [orderId, orders, navigate]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getTableSizeLabel = (value: string) => {
    const option = tableSizeOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const getColourLabel = (value: string) => {
    const option = colourOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const invoiceContent = document.getElementById('invoice-content');
      if (invoiceContent) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice - ${invoiceNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .logo { max-width: 150px; max-height: 100px; }
                .invoice-details { margin-bottom: 30px; }
                .customer-details { margin-bottom: 30px; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                .items-table th { background-color: #f5f5f5; }
                .total-section { text-align: right; }
                .total-amount { font-size: 18px; font-weight: bold; }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${invoiceContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 no-print">
        <Button onClick={() => navigate('/history')} variant="outline" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Order History
        </Button>
        
        <div className="flex gap-4 mb-6">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleDownload} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader className="no-print">
          <CardTitle>Invoice Generator</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Business Information Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 no-print">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter your business name"
              />
            </div>
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="businessPhone">Business Phone</Label>
              <Input
                id="businessPhone"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="Enter business phone"
              />
            </div>
            <div>
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="businessEmail">Business Email</Label>
              <Input
                id="businessEmail"
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="Enter business email"
              />
            </div>
            <div>
              <Label htmlFor="logo">Business Logo</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('logo')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </Button>
                {logoUrl && <span className="text-sm text-green-600">Logo uploaded</span>}
              </div>
            </div>
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="businessAddress">Business Address</Label>
              <Textarea
                id="businessAddress"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Enter your business address"
                rows={3}
              />
            </div>
          </div>

          {/* Invoice Content */}
          <div id="invoice-content" className="border-t pt-8">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                {logoUrl && (
                  <img src={logoUrl} alt="Business Logo" className="logo mb-4" />
                )}
                <h1 className="text-3xl font-bold">{businessName || 'Your Business Name'}</h1>
                {businessAddress && (
                  <p className="text-gray-600 mt-2 whitespace-pre-line">{businessAddress}</p>
                )}
                {businessPhone && (
                  <p className="text-gray-600">Phone: {businessPhone}</p>
                )}
                {businessEmail && (
                  <p className="text-gray-600">Email: {businessEmail}</p>
                )}
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-800">INVOICE</h2>
                <p className="text-gray-600">Invoice #: {invoiceNumber}</p>
                <p className="text-gray-600">Date: {format(new Date(invoiceDate), 'MMM d, yyyy')}</p>
              </div>
            </div>

            {/* Customer Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Bill To:</h3>
              <div className="bg-gray-50 p-4 rounded">
                <p className="font-semibold">{order.customerName}</p>
                <p className="text-gray-600">{order.address}</p>
                <p className="text-gray-600">Phone: {order.contactNumber}</p>
              </div>
            </div>

            {/* Order Details */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Order Details:</h3>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Size</th>
                    <th>Top Colour</th>
                    <th>Leg Colour</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.tables?.map((table, index) => (
                    <tr key={table.id || index}>
                      <td>Table</td>
                      <td>{getTableSizeLabel(table.size)}</td>
                      <td>{getColourLabel(table.topColour)}</td>
                      <td>{getColourLabel(table.frameColour)}</td>
                      <td>{table.quantity}</td>
                      <td>{formatPrice(table.price / table.quantity)}</td>
                      <td>{formatPrice(table.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Order Summary */}
            <div className="total-section">
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal:</span>
                    <span>{formatPrice(order.totalPrice - (order.deliveryFee || 0) - (order.additionalCharges || 0))}</span>
                  </div>
                  {order.deliveryFee && order.deliveryFee > 0 && (
                    <div className="flex justify-between mb-2">
                      <span>Delivery Fee:</span>
                      <span>{formatPrice(order.deliveryFee)}</span>
                    </div>
                  )}
                  {order.additionalCharges && order.additionalCharges !== 0 && (
                    <div className="flex justify-between mb-2">
                      <span>{order.additionalCharges > 0 ? 'Additional Charges:' : 'Discount:'}</span>
                      <span>{formatPrice(Math.abs(order.additionalCharges))}</span>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex justify-between total-amount">
                      <span>Total Amount:</span>
                      <span>{formatPrice(order.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-8 text-sm text-gray-600">
              <p>Order Created: {format(new Date(order.createdAt), 'MMM d, yyyy')}</p>
              {order.completedAt && (
                <p>Order Completed: {format(new Date(order.completedAt), 'MMM d, yyyy')}</p>
              )}
              {order.note && (
                <div className="mt-4">
                  <p className="font-semibold">Notes:</p>
                  <p className="text-red-600">{order.note}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoice;
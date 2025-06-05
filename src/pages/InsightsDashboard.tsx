
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, TrendingUp, Package, DollarSign, Users, Target } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface DashboardData {
  dailyOrders: Array<{ date: string; orders: number; completed: number }>;
  sizeDistribution: Array<{ size: string; count: number; percentage: number }>;
  colourDistribution: Array<{ colour: string; count: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  salesPersonStats: Array<{ name: string; orders: number; revenue: number }>;
  totalStats: {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const InsightsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is the specific admin
  const isAuthorizedAdmin = user?.email === 'kalanabimsara8@gmail.com';

  useEffect(() => {
    if (isAuthorizedAdmin) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [isAuthorizedAdmin]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all orders with related data
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_tables (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dashboard data:', error);
        return;
      }

      if (!orders) return;

      // Process daily orders for the last 30 days
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), i);
        return format(date, 'MMM dd');
      }).reverse();

      const dailyOrdersMap = new Map();
      const dailyCompletedMap = new Map();

      orders.forEach(order => {
        const orderDate = format(new Date(order.created_at), 'MMM dd');
        dailyOrdersMap.set(orderDate, (dailyOrdersMap.get(orderDate) || 0) + 1);
        
        if (order.status === 'completed') {
          dailyCompletedMap.set(orderDate, (dailyCompletedMap.get(orderDate) || 0) + 1);
        }
      });

      const dailyOrders = last30Days.map(date => ({
        date,
        orders: dailyOrdersMap.get(date) || 0,
        completed: dailyCompletedMap.get(date) || 0
      }));

      // Process size distribution
      const sizeMap = new Map();
      let totalTables = 0;

      orders.forEach(order => {
        if (order.order_tables) {
          order.order_tables.forEach((table: any) => {
            const count = table.quantity || 1;
            sizeMap.set(table.size, (sizeMap.get(table.size) || 0) + count);
            totalTables += count;
          });
        }
      });

      const sizeDistribution = Array.from(sizeMap.entries()).map(([size, count]) => ({
        size,
        count,
        percentage: Math.round((count / totalTables) * 100)
      }));

      // Process colour distribution
      const colourMap = new Map();
      orders.forEach(order => {
        if (order.order_tables) {
          order.order_tables.forEach((table: any) => {
            const colour = table.top_colour || table.colour;
            colourMap.set(colour, (colourMap.get(colour) || 0) + (table.quantity || 1));
          });
        }
      });

      const colourDistribution = Array.from(colourMap.entries()).map(([colour, count]) => ({
        colour,
        count
      }));

      // Process monthly revenue (last 6 months)
      const monthlyRevenueMap = new Map();
      orders.forEach(order => {
        const month = format(new Date(order.created_at), 'MMM yyyy');
        const revenue = parseFloat(order.price) || 0;
        monthlyRevenueMap.set(month, (monthlyRevenueMap.get(month) || 0) + revenue);
      });

      const monthlyRevenue = Array.from(monthlyRevenueMap.entries())
        .map(([month, revenue]) => ({ month, revenue }))
        .slice(-6);

      // Process sales person stats
      const salesPersonMap = new Map();
      orders.forEach(order => {
        const salesPerson = order.sales_person_name || 'Unknown';
        const revenue = parseFloat(order.price) || 0;
        const existing = salesPersonMap.get(salesPerson) || { orders: 0, revenue: 0 };
        salesPersonMap.set(salesPerson, {
          orders: existing.orders + 1,
          revenue: existing.revenue + revenue
        });
      });

      const salesPersonStats = Array.from(salesPersonMap.entries()).map(([name, stats]) => ({
        name,
        orders: stats.orders,
        revenue: stats.revenue
      }));

      // Calculate total stats
      const totalOrders = orders.length;
      const completedOrders = orders.filter(order => order.status === 'completed').length;
      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.price) || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setDashboardData({
        dailyOrders,
        sizeDistribution,
        colourDistribution,
        monthlyRevenue,
        salesPersonStats,
        totalStats: {
          totalOrders,
          completedOrders,
          pendingOrders,
          totalRevenue,
          averageOrderValue
        }
      });
    } catch (error) {
      console.error('Error processing dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorizedAdmin) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground text-center">
              This insights dashboard is only available for authorized administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No data available for insights.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { dailyOrders, sizeDistribution, colourDistribution, monthlyRevenue, salesPersonStats, totalStats } = dashboardData;

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Admin Insights Dashboard</h1>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalStats.completedOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalStats.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {totalStats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {Math.round(totalStats.averageOrderValue).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Order Activity (Last 30 Days)</CardTitle>
            <CardDescription>Orders created vs completed daily</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyOrders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#8884d8" name="Orders Created" />
                  <Bar dataKey="completed" fill="#82ca9d" name="Orders Completed" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Table Size Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Table Sizes</CardTitle>
            <CardDescription>Distribution of table sizes ordered</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sizeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ size, percentage }) => `${size} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {sizeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
            <CardDescription>Revenue performance over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip formatter={(value) => [`LKR ${value.toLocaleString()}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Colour Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Table Colours</CardTitle>
            <CardDescription>Distribution of table top colours</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={colourDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="colour" />
                  <YAxis />
                  <ChartTooltip />
                  <Bar dataKey="count" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sales Person Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sales Person Performance
          </CardTitle>
          <CardDescription>Orders and revenue by sales person</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesPersonStats.map((person, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h4 className="font-semibold text-lg">{person.name}</h4>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Orders: <span className="font-medium">{person.orders}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Revenue: <span className="font-medium">LKR {person.revenue.toLocaleString()}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Avg per Order: <span className="font-medium">
                      LKR {Math.round(person.revenue / person.orders).toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightsDashboard;

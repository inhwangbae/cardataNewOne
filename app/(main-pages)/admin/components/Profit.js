"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Spinner, Card, CardBody } from "@nextui-org/react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@nextui-org/react";
import { Select, SelectItem } from "@nextui-org/select";

function Profit({ session, language }) {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [profitData, setProfitData] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [summary, setSummary] = useState({
    totalPurchases: 0,
    totalSales: 0,
    totalExpenses: 0,
    totalProfit: 0,
    averageProfitMargin: 0,
  });
  const [filterStatus, setFilterStatus] = useState("all");

  const getData = async () => {
    try {
      // 차량별 수익률 데이터 (뷰 사용)
      let profitQuery = supabase
        .from("vehicle_profit_analysis")
        .select("*")
        .order("purchase_date", { ascending: false });

      if (filterStatus !== "all") {
        profitQuery = profitQuery.eq("status", filterStatus);
      }

      const { data: profitData, error: profitError } = await profitQuery;

      if (profitError) {
        console.error("Error fetching profit data:", profitError);
        toast.error("수익률 데이터를 불러오는데 실패했습니다.");
      } else {
        setProfitData(profitData || []);
        calculateSummary(profitData || []);
      }

      // 직원별 성과 데이터 (뷰 사용)
      const { data: staffData, error: staffError } = await supabase
        .from("staff_performance")
        .select("*")
        .order("gross_profit", { ascending: false });

      if (staffError) {
        console.error("Error fetching staff performance:", staffError);
      } else {
        setStaffPerformance(staffData || []);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error in getData:", error);
      setIsLoading(false);
    }
  };

  const calculateSummary = (data) => {
    const totalPurchases = data.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0);
    const totalSales = data.reduce((sum, item) => sum + (parseFloat(item.sale_price) || 0), 0);
    const totalExpenses = data.reduce((sum, item) => sum + (parseFloat(item.total_expenses) || 0), 0);
    const totalProfit = data.reduce((sum, item) => sum + (parseFloat(item.net_profit) || 0), 0);

    // 평균 수익률 계산 (판매된 차량만)
    const soldVehicles = data.filter(item => item.status === 'sold');
    const averageProfitMargin = soldVehicles.length > 0
      ? soldVehicles.reduce((sum, item) => sum + (parseFloat(item.profit_margin_percent) || 0), 0) / soldVehicles.length
      : 0;

    setSummary({
      totalPurchases,
      totalSales,
      totalExpenses,
      totalProfit,
      averageProfitMargin,
    });
  };

  useEffect(() => {
    getData();
  }, [filterStatus]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center items-center w-full h-screen">
          <Spinner />
        </div>
      ) : (
        <div className="mt-5">
          <ToastContainer
            position="top-center"
            autoClose={1000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />

          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardBody>
                <p className="text-sm text-gray-500">총 매입액</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatPrice(summary.totalPurchases)}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-sm text-gray-500">총 매출액</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(summary.totalSales)}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-sm text-gray-500">총 비용</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatPrice(summary.totalExpenses)}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-sm text-gray-500">순이익</p>
                <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatPrice(summary.totalProfit)}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-sm text-gray-500">평균 수익률</p>
                <p className={`text-2xl font-bold ${summary.averageProfitMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatPercent(summary.averageProfitMargin)}
                </p>
              </CardBody>
            </Card>
          </div>

          {/* 차량별 수익률 */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">차량별 수익률</h2>
              <Select
                placeholder="상태 필터"
                className="w-40"
                defaultSelectedKeys={["all"]}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <SelectItem key="all" value="all">
                  전체
                </SelectItem>
                <SelectItem key="in_stock" value="in_stock">
                  재고
                </SelectItem>
                <SelectItem key="sold" value="sold">
                  판매완료
                </SelectItem>
              </Select>
            </div>

            <div className="w-full overflow-x-auto">
              <Table aria-label="Vehicle profit table" className="min-w-[1000px]">
                <TableHeader>
                  <TableColumn className="text-center">차량명</TableColumn>
                  <TableColumn className="text-center">매입일</TableColumn>
                  <TableColumn className="text-center">매입가</TableColumn>
                  <TableColumn className="text-center">매출가</TableColumn>
                  <TableColumn className="text-center">총비용</TableColumn>
                  <TableColumn className="text-center">순이익</TableColumn>
                  <TableColumn className="text-center">수익률</TableColumn>
                  <TableColumn className="text-center">상태</TableColumn>
                </TableHeader>
                <TableBody>
                  {profitData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center">
                        {item.car_title || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.purchase_date || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatPrice(item.purchase_price)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.sale_price ? formatPrice(item.sale_price) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatPrice(item.total_expenses)}
                      </TableCell>
                      <TableCell className={`text-center ${
                        parseFloat(item.net_profit) >= 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {formatPrice(item.net_profit)}
                      </TableCell>
                      <TableCell className={`text-center font-bold ${
                        parseFloat(item.profit_margin_percent) >= 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {formatPercent(item.profit_margin_percent)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.status === 'sold' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status === 'sold' ? '판매완료' : '재고'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 직원별 성과 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">직원별 성과</h2>
            <div className="w-full overflow-x-auto">
              <Table aria-label="Staff performance table" className="min-w-[800px]">
                <TableHeader>
                  <TableColumn className="text-center">직원명</TableColumn>
                  <TableColumn className="text-center">사번</TableColumn>
                  <TableColumn className="text-center">매입 건수</TableColumn>
                  <TableColumn className="text-center">매출 건수</TableColumn>
                  <TableColumn className="text-center">총 매입액</TableColumn>
                  <TableColumn className="text-center">총 매출액</TableColumn>
                  <TableColumn className="text-center">총 이익</TableColumn>
                  <TableColumn className="text-center">담당 고객</TableColumn>
                </TableHeader>
                <TableBody>
                  {staffPerformance.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center">
                        {item.staff_name || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.employee_number || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.total_purchases || 0}건
                      </TableCell>
                      <TableCell className="text-center">
                        {item.total_sales || 0}건
                      </TableCell>
                      <TableCell className="text-center">
                        {formatPrice(item.total_purchase_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatPrice(item.total_sale_amount)}
                      </TableCell>
                      <TableCell className={`text-center font-bold ${
                        parseFloat(item.gross_profit) >= 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {formatPrice(item.gross_profit)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.assigned_customers || 0}명
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Profit;

"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Pagination, Chip } from "@nextui-org/react";
import { createClient } from "@/utils/supabase/client";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from "@nextui-org/react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Textarea,
} from "@nextui-org/react";
import { SearchIcon } from "./SearchIcon";
import { Select, SelectItem } from "@nextui-org/select";
import debounce from "lodash/debounce";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Spinner } from "@nextui-org/react";

function Transactions({ session, language }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onOpenChange: onAddOpenChange } = useDisclosure();
  const { isOpen: isExpenseOpen, onOpen: onExpenseOpen, onOpenChange: onExpenseOpenChange } = useDisclosure();

  const supabase = createClient();
  const [data, setData] = useState([]);
  const [cars, setCars] = useState([]);
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [owners, setOwners] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [count, setCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState("1");
  const [selectData, setSelectData] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 10;
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  // 새 거래 추가용 상태
  const [newTransaction, setNewTransaction] = useState({
    car_id: "",
    transaction_type: "purchase",
    staff_id: "",
    customer_id: "",
    owner_id: "",
    transaction_price: 0,
    currency: "KRW",
    transaction_date: new Date().toISOString().split('T')[0],
    contract_number: "",
    payment_method: "",
    payment_status: "pending",
    notes: "",
  });

  // 비용 추가용 상태
  const [newExpense, setNewExpense] = useState({
    transaction_id: "",
    car_id: "",
    expense_type: "transfer_fee",
    expense_category: "",
    amount: 0,
    currency: "KRW",
    expense_date: new Date().toISOString().split('T')[0],
    vendor: "",
    description: "",
  });

  const getData = async () => {
    let query = supabase
      .from("transactions")
      .select(`
        *,
        cardata:car_id (
          id,
          title
        ),
        staff:staff_id (
          id,
          employee_number,
          profiles:profile_id (
            name
          )
        ),
        profiles:customer_id (
          id,
          name,
          email
        ),
        owners:owner_id (
          id,
          name,
          phone
        )
      `, { count: "exact" })
      .order("transaction_date", { ascending: false })
      .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

    if (filterType !== "all") {
      query = query.eq("transaction_type", filterType);
    }

    if (searchValue) {
      query = query.or(`contract_number.ilike.%${searchValue}%,notes.ilike.%${searchValue}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
      toast.error("거래 데이터를 불러오는데 실패했습니다.");
      return;
    }
    setData(data);
    setCount(count);
    setTotalPages(Math.ceil(count / itemsPerPage));
    setIsLoading(false);
  };

  const getRelatedData = async () => {
    // 차량 목록
    const { data: carsData } = await supabase
      .from("cardata")
      .select("id, title")
      .order("created_at", { ascending: false })
      .limit(100);
    setCars(carsData || []);

    // 직원 목록
    const { data: staffData } = await supabase
      .from("staff")
      .select(`
        id,
        employee_number,
        profiles:profile_id (
          name
        )
      `)
      .eq("status", "active");
    setStaff(staffData || []);

    // 고객 목록
    const { data: customersData } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("role", "client")
      .order("name");
    setCustomers(customersData || []);

    // 소유주 목록
    const { data: ownersData } = await supabase
      .from("owners")
      .select("id, name, phone")
      .order("name");
    setOwners(ownersData || []);
  };

  const getExpenses = async (transactionId) => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("expense_date", { ascending: false });

    if (error) {
      console.error("Error fetching expenses:", error);
      return;
    }
    setExpenses(data || []);
  };

  const debouncedSearch = useCallback(
    debounce((value) => {
      setDebouncedSearchValue(value);
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    debouncedSearch(e.target.value);
  };

  useEffect(() => {
    getData();
  }, [currentPage, debouncedSearchValue, filterType]);

  useEffect(() => {
    getRelatedData();
  }, []);

  const handleSubmit = async (selectData) => {
    const { data, error } = await supabase
      .from("transactions")
      .update({
        transaction_price: parseFloat(selectData.transaction_price),
        transaction_date: selectData.transaction_date,
        contract_number: selectData.contract_number,
        payment_method: selectData.payment_method,
        payment_status: selectData.payment_status,
        notes: selectData.notes,
        status: selectData.status,
      })
      .eq("id", selectData.id);

    if (error) {
      console.error("Error updating transaction:", error);
      toast.error("거래 정보 수정 실패");
      return;
    }
    toast.success("거래 정보 수정 완료");
    getData();
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.car_id || !newTransaction.transaction_price) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }

    // 거래 유형에 따라 필수 필드 확인
    if (newTransaction.transaction_type === "purchase" && !newTransaction.owner_id) {
      toast.error("매입 거래는 소유주 정보가 필요합니다.");
      return;
    }

    if (newTransaction.transaction_type === "sale" && !newTransaction.customer_id) {
      toast.error("매출 거래는 고객 정보가 필요합니다.");
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert([{
        car_id: newTransaction.car_id,
        transaction_type: newTransaction.transaction_type,
        staff_id: newTransaction.staff_id || null,
        customer_id: newTransaction.transaction_type === 'sale' ? newTransaction.customer_id : null,
        owner_id: newTransaction.transaction_type === 'purchase' ? newTransaction.owner_id : null,
        transaction_price: parseFloat(newTransaction.transaction_price),
        currency: newTransaction.currency,
        transaction_date: newTransaction.transaction_date,
        contract_number: newTransaction.contract_number,
        payment_method: newTransaction.payment_method,
        payment_status: newTransaction.payment_status,
        notes: newTransaction.notes,
        status: 'active',
      }]);

    if (error) {
      console.error("Error adding transaction:", error);
      toast.error("거래 추가 실패: " + error.message);
      return;
    }

    toast.success("거래 추가 완료");
    setNewTransaction({
      car_id: "",
      transaction_type: "purchase",
      staff_id: "",
      customer_id: "",
      owner_id: "",
      transaction_price: 0,
      currency: "KRW",
      transaction_date: new Date().toISOString().split('T')[0],
      contract_number: "",
      payment_method: "",
      payment_status: "pending",
      notes: "",
    });
    getData();
  };

  const handleAddExpense = async () => {
    if (!newExpense.transaction_id || !newExpense.amount) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert([{
        transaction_id: newExpense.transaction_id,
        car_id: newExpense.car_id,
        expense_type: newExpense.expense_type,
        expense_category: newExpense.expense_category,
        amount: parseFloat(newExpense.amount),
        currency: newExpense.currency,
        expense_date: newExpense.expense_date,
        vendor: newExpense.vendor,
        description: newExpense.description,
        status: 'confirmed',
      }]);

    if (error) {
      console.error("Error adding expense:", error);
      toast.error("비용 추가 실패: " + error.message);
      return;
    }

    toast.success("비용 추가 완료");
    setNewExpense({
      transaction_id: "",
      car_id: "",
      expense_type: "transfer_fee",
      expense_category: "",
      amount: 0,
      currency: "KRW",
      expense_date: new Date().toISOString().split('T')[0],
      vendor: "",
      description: "",
    });
    getExpenses(newExpense.transaction_id);
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!confirm("정말 삭제하시겠습니까? 관련 비용도 함께 삭제됩니다.")) return;

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transactionId);

    if (error) {
      console.error("Error deleting transaction:", error);
      toast.error("거래 삭제 실패");
      return;
    }

    toast.success("거래 삭제 완료");
    getData();
  };

  const formatPrice = (price, currency = "KRW") => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getCarTitle = (car) => {
    if (!car || !car.title) return '-';
    return car.title.kr || car.title.en || '-';
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
          <div className="flex flex-col gap-y-5">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <Button
                onPress={onAddOpen}
                className="bg-blue-500 text-white"
              >
                거래 추가
              </Button>
              <div className="flex gap-3 flex-wrap">
                <Select
                  placeholder="거래 유형"
                  className="w-40"
                  defaultSelectedKeys={["all"]}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <SelectItem key="all" value="all">
                    전체
                  </SelectItem>
                  <SelectItem key="purchase" value="purchase">
                    매입
                  </SelectItem>
                  <SelectItem key="sale" value="sale">
                    매출
                  </SelectItem>
                </Select>
                <Input
                  startContent={
                    <SearchIcon className="text-black/50 mb-0.5 text-slate-400 pointer-events-none flex-shrink-0" />
                  }
                  onChange={handleSearchChange}
                  value={searchValue}
                  className="w-60"
                  type="text"
                  variant="bordered"
                  placeholder="계약번호 또는 메모 검색..."
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <Table aria-label="Transactions table" className="min-w-[1200px]">
                <TableHeader>
                  <TableColumn className="text-center whitespace-nowrap">거래일</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">거래유형</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">차량</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">담당직원</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">거래처</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">거래금액</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">계약번호</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">결제상태</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">관리</TableColumn>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.transaction_date}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Chip
                          color={item.transaction_type === 'purchase' ? 'warning' : 'success'}
                          variant="flat"
                          size="sm"
                        >
                          {item.transaction_type === 'purchase' ? '매입' : '매출'}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {getCarTitle(item.cardata)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.staff?.profiles?.name || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.transaction_type === 'purchase'
                          ? (item.owners?.name || '-')
                          : (item.profiles?.name || '-')
                        }
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {formatPrice(item.transaction_price, item.currency)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.contract_number || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Chip
                          color={
                            item.payment_status === 'completed' ? 'success' :
                            item.payment_status === 'partial' ? 'warning' : 'default'
                          }
                          variant="flat"
                          size="sm"
                        >
                          {item.payment_status === 'completed' ? '완료' :
                           item.payment_status === 'partial' ? '부분' : '대기'}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="flex gap-2 justify-center">
                          <Button
                            onPress={() => {
                              onOpen();
                              setSelectData(item);
                              getExpenses(item.id);
                            }}
                            size="sm"
                            variant="bordered"
                            color="primary"
                          >
                            상세
                          </Button>
                          <Button
                            onPress={() => handleDeleteTransaction(item.id)}
                            size="sm"
                            variant="bordered"
                            color="danger"
                          >
                            삭제
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex w-full justify-center items-center py-5">
            <Pagination
              total={totalPages}
              initialPage={1}
              page={currentPage}
              onChange={(page) => setCurrentPage(page)}
              className="text-white"
            />
          </div>

          {/* 거래 상세/수정 모달 */}
          <Modal size={"3xl"} isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside">
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    거래 상세 정보
                  </ModalHeader>
                  <ModalBody>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h1 className="mb-2 font-semibold">거래 유형</h1>
                        <Input
                          value={selectData?.transaction_type === 'purchase' ? '매입' : '매출'}
                          disabled
                          className="w-full"
                        />
                      </div>
                      <div>
                        <h1 className="mb-2 font-semibold">거래 금액</h1>
                        <Input
                          onChange={(e) =>
                            setSelectData({ ...selectData, transaction_price: e.target.value })
                          }
                          value={selectData?.transaction_price || ""}
                          className="w-full"
                          type="number"
                        />
                      </div>
                      <div>
                        <h1 className="mb-2 font-semibold">거래일</h1>
                        <Input
                          onChange={(e) =>
                            setSelectData({ ...selectData, transaction_date: e.target.value })
                          }
                          value={selectData?.transaction_date || ""}
                          className="w-full"
                          type="date"
                        />
                      </div>
                      <div>
                        <h1 className="mb-2 font-semibold">계약번호</h1>
                        <Input
                          onChange={(e) =>
                            setSelectData({ ...selectData, contract_number: e.target.value })
                          }
                          value={selectData?.contract_number || ""}
                          className="w-full"
                          type="text"
                        />
                      </div>
                      <div>
                        <h1 className="mb-2 font-semibold">결제 방법</h1>
                        <Input
                          onChange={(e) =>
                            setSelectData({ ...selectData, payment_method: e.target.value })
                          }
                          value={selectData?.payment_method || ""}
                          className="w-full"
                          type="text"
                          placeholder="예: 현금, 계좌이체, 카드"
                        />
                      </div>
                      <div>
                        <h1 className="mb-2 font-semibold">결제 상태</h1>
                        <Select
                          onChange={(e) =>
                            setSelectData({ ...selectData, payment_status: e.target.value })
                          }
                          selectedKeys={selectData?.payment_status ? [selectData.payment_status] : []}
                          className="w-full"
                        >
                          <SelectItem key="pending" value="pending">
                            대기
                          </SelectItem>
                          <SelectItem key="partial" value="partial">
                            부분 결제
                          </SelectItem>
                          <SelectItem key="completed" value="completed">
                            완료
                          </SelectItem>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <h1 className="mb-2 font-semibold">메모</h1>
                        <Textarea
                          onChange={(e) =>
                            setSelectData({ ...selectData, notes: e.target.value })
                          }
                          value={selectData?.notes || ""}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* 비용 내역 */}
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">비용 내역</h2>
                        <Button
                          onPress={() => {
                            setNewExpense({
                              ...newExpense,
                              transaction_id: selectData?.id,
                              car_id: selectData?.car_id,
                            });
                            onExpenseOpen();
                          }}
                          size="sm"
                          color="primary"
                        >
                          비용 추가
                        </Button>
                      </div>
                      {expenses.length > 0 ? (
                        <Table aria-label="Expenses table">
                          <TableHeader>
                            <TableColumn>날짜</TableColumn>
                            <TableColumn>유형</TableColumn>
                            <TableColumn>금액</TableColumn>
                            <TableColumn>업체</TableColumn>
                          </TableHeader>
                          <TableBody>
                            {expenses.map((expense) => (
                              <TableRow key={expense.id}>
                                <TableCell>{expense.expense_date}</TableCell>
                                <TableCell>{getExpenseTypeLabel(expense.expense_type)}</TableCell>
                                <TableCell>{formatPrice(expense.amount, expense.currency)}</TableCell>
                                <TableCell>{expense.vendor || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-gray-500 text-center py-4">비용 내역이 없습니다.</p>
                      )}
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      className="bg-red-500"
                      color="danger"
                      variant="bordered"
                      onPress={onClose}
                    >
                      취소
                    </Button>
                    <Button
                      className="text-white"
                      color="primary"
                      onPress={() => {
                        handleSubmit(selectData);
                        onClose();
                      }}
                    >
                      저장
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          {/* 거래 추가 모달 */}
          <Modal size={"2xl"} isOpen={isAddOpen} onOpenChange={onAddOpenChange} scrollBehavior="inside">
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>거래 추가</ModalHeader>
                  <ModalBody className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">거래 유형 *</h1>
                      <Select
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, transaction_type: e.target.value })
                        }
                        selectedKeys={[newTransaction.transaction_type]}
                        className="w-full"
                      >
                        <SelectItem key="purchase" value="purchase">
                          매입
                        </SelectItem>
                        <SelectItem key="sale" value="sale">
                          매출
                        </SelectItem>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">차량 선택 *</h1>
                      <Select
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, car_id: e.target.value })
                        }
                        placeholder="차량을 선택하세요"
                        className="w-full"
                      >
                        {cars.map((car) => (
                          <SelectItem key={car.id} value={car.id}>
                            {getCarTitle(car)}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">담당 직원</h1>
                      <Select
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, staff_id: e.target.value })
                        }
                        placeholder="직원 선택"
                        className="w-full"
                      >
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.profiles?.name} ({s.employee_number})
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    {newTransaction.transaction_type === 'purchase' ? (
                      <div>
                        <h1 className="mb-2 font-semibold">소유주 *</h1>
                        <Select
                          onChange={(e) =>
                            setNewTransaction({ ...newTransaction, owner_id: e.target.value })
                          }
                          placeholder="소유주 선택"
                          className="w-full"
                        >
                          {owners.map((owner) => (
                            <SelectItem key={owner.id} value={owner.id}>
                              {owner.name} ({owner.phone})
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <h1 className="mb-2 font-semibold">고객 *</h1>
                        <Select
                          onChange={(e) =>
                            setNewTransaction({ ...newTransaction, customer_id: e.target.value })
                          }
                          placeholder="고객 선택"
                          className="w-full"
                        >
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} ({customer.email})
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                    )}
                    <div>
                      <h1 className="mb-2 font-semibold">거래 금액 *</h1>
                      <Input
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, transaction_price: e.target.value })
                        }
                        value={newTransaction.transaction_price}
                        className="w-full"
                        type="number"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">거래일 *</h1>
                      <Input
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, transaction_date: e.target.value })
                        }
                        value={newTransaction.transaction_date}
                        className="w-full"
                        type="date"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">계약번호</h1>
                      <Input
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, contract_number: e.target.value })
                        }
                        value={newTransaction.contract_number}
                        className="w-full"
                        type="text"
                        placeholder="예: CT-2024-001"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">결제 방법</h1>
                      <Input
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, payment_method: e.target.value })
                        }
                        value={newTransaction.payment_method}
                        className="w-full"
                        type="text"
                        placeholder="예: 현금, 계좌이체"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">메모</h1>
                      <Textarea
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, notes: e.target.value })
                        }
                        value={newTransaction.notes}
                        className="w-full"
                        placeholder="거래 관련 메모..."
                      />
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      className="bg-red-500"
                      color="danger"
                      variant="bordered"
                      onPress={onClose}
                    >
                      취소
                    </Button>
                    <Button
                      className="text-white"
                      color="primary"
                      onPress={() => {
                        handleAddTransaction();
                        onClose();
                      }}
                    >
                      추가
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          {/* 비용 추가 모달 */}
          <Modal size={"lg"} isOpen={isExpenseOpen} onOpenChange={onExpenseOpenChange}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>비용 추가</ModalHeader>
                  <ModalBody className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">비용 유형 *</h1>
                      <Select
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, expense_type: e.target.value })
                        }
                        selectedKeys={[newExpense.expense_type]}
                        className="w-full"
                      >
                        <SelectItem key="transfer_fee" value="transfer_fee">
                          이전비
                        </SelectItem>
                        <SelectItem key="maintenance" value="maintenance">
                          정비비
                        </SelectItem>
                        <SelectItem key="insurance" value="insurance">
                          보험료
                        </SelectItem>
                        <SelectItem key="shipping" value="shipping">
                          운송비
                        </SelectItem>
                        <SelectItem key="customs" value="customs">
                          관세
                        </SelectItem>
                        <SelectItem key="inspection" value="inspection">
                          검사비
                        </SelectItem>
                        <SelectItem key="other" value="other">
                          기타
                        </SelectItem>
                      </Select>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">금액 *</h1>
                      <Input
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, amount: e.target.value })
                        }
                        value={newExpense.amount}
                        className="w-full"
                        type="number"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">비용 발생일 *</h1>
                      <Input
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, expense_date: e.target.value })
                        }
                        value={newExpense.expense_date}
                        className="w-full"
                        type="date"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">업체명</h1>
                      <Input
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, vendor: e.target.value })
                        }
                        value={newExpense.vendor}
                        className="w-full"
                        type="text"
                        placeholder="업체명"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">설명</h1>
                      <Textarea
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, description: e.target.value })
                        }
                        value={newExpense.description}
                        className="w-full"
                        placeholder="비용 설명..."
                      />
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      className="bg-red-500"
                      color="danger"
                      variant="bordered"
                      onPress={onClose}
                    >
                      취소
                    </Button>
                    <Button
                      className="text-white"
                      color="primary"
                      onPress={() => {
                        handleAddExpense();
                        onClose();
                      }}
                    >
                      추가
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </div>
      )}
    </>
  );
}

function getExpenseTypeLabel(type) {
  const labels = {
    transfer_fee: '이전비',
    maintenance: '정비비',
    insurance: '보험료',
    shipping: '운송비',
    customs: '관세',
    inspection: '검사비',
    other: '기타',
  };
  return labels[type] || type;
}

export default Transactions;

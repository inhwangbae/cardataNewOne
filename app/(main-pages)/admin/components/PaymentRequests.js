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

function PaymentRequests({ session, language }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onOpenChange: onDetailOpenChange } = useDisclosure();

  const supabase = createClient();
  const [data, setData] = useState([]);
  const [approvers, setApprovers] = useState([]); // 승인 가능한 관리자들
  const [cars, setCars] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [count, setCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState("1");
  const [selectData, setSelectData] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 10;
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  // 새 결제 요청
  const [newRequest, setNewRequest] = useState({
    payment_type: "vehicle_deposit",
    amount: 0,
    currency: "KRW",
    transaction_id: "",
    car_id: "",
    customer_id: "",
    title: "",
    description: "",
    payment_due_date: "",
    recipient_name: "",
    recipient_bank: "",
    recipient_account: "",
    approver_id: "",
    approver_position: "",
  });

  const paymentTypes = {
    vehicle_deposit: "차량 계약금",
    vehicle_interim: "차량 중도금",
    vehicle_balance: "차량 잔금",
    miscellaneous: "기타 부대비",
    transfer_fee: "이전비",
    referral_fee: "소개비",
    expense_report: "지출결의서",
    refund_request: "환불요청서",
  };

  const approverPositions = [
    "과장",
    "차장",
    "부장",
    "지점장",
    "이사",
    "대표",
  ];

  const getData = async () => {
    let query = supabase
      .from("payment_requests")
      .select(`
        *,
        profiles:requester_id (
          name,
          email
        ),
        staff:approver_id (
          id,
          employee_number,
          profiles:profile_id (
            name
          )
        ),
        cardata:car_id (
          title
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

    if (filterStatus !== "all") {
      query = query.eq("approval_status", filterStatus);
    }

    if (searchValue) {
      query = query.or(`title.ilike.%${searchValue}%,description.ilike.%${searchValue}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching payment requests:", error);
      toast.error("결제 요청을 불러오는데 실패했습니다.");
      return;
    }
    setData(data);
    setCount(count);
    setTotalPages(Math.ceil(count / itemsPerPage));
    setIsLoading(false);
  };

  const getRelatedData = async () => {
    // 승인 가능한 관리자 (특정 직급의 직원들)
    const { data: staffData } = await supabase
      .from("staff")
      .select(`
        id,
        employee_number,
        position,
        profiles:profile_id (
          name
        )
      `)
      .eq("status", "active")
      .in("position", approverPositions);
    setApprovers(staffData || []);

    // 차량 목록
    const { data: carsData } = await supabase
      .from("cardata")
      .select("id, title")
      .order("created_at", { ascending: false })
      .limit(100);
    setCars(carsData || []);

    // 고객 목록
    const { data: customersData } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("role", "client")
      .order("name");
    setCustomers(customersData || []);

    // 거래 목록
    const { data: transactionsData } = await supabase
      .from("transactions")
      .select("id, transaction_type, contract_number")
      .order("transaction_date", { ascending: false })
      .limit(100);
    setTransactions(transactionsData || []);
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
  }, [currentPage, debouncedSearchValue, filterStatus]);

  useEffect(() => {
    getRelatedData();
  }, []);

  const handleCreateRequest = async () => {
    if (!newRequest.title || !newRequest.amount || !newRequest.approver_id) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }

    const { data, error } = await supabase
      .from("payment_requests")
      .insert([{
        requester_id: session?.user?.id,
        payment_type: newRequest.payment_type,
        amount: parseFloat(newRequest.amount),
        currency: newRequest.currency,
        transaction_id: newRequest.transaction_id || null,
        car_id: newRequest.car_id || null,
        customer_id: newRequest.customer_id || null,
        title: newRequest.title,
        description: newRequest.description,
        payment_due_date: newRequest.payment_due_date || null,
        recipient_name: newRequest.recipient_name,
        recipient_bank: newRequest.recipient_bank,
        recipient_account: newRequest.recipient_account,
        approver_id: newRequest.approver_id,
        approver_position: newRequest.approver_position,
        approval_status: 'pending',
        status: 'active',
      }]);

    if (error) {
      console.error("Error creating payment request:", error);
      toast.error("결제 요청 생성 실패: " + error.message);
      return;
    }

    toast.success("결제 요청이 생성되었습니다.");
    setNewRequest({
      payment_type: "vehicle_deposit",
      amount: 0,
      currency: "KRW",
      transaction_id: "",
      car_id: "",
      customer_id: "",
      title: "",
      description: "",
      payment_due_date: "",
      recipient_name: "",
      recipient_bank: "",
      recipient_account: "",
      approver_id: "",
      approver_position: "",
    });
    getData();
  };

  const handleCancelRequest = async (requestId) => {
    if (!confirm("정말 요청을 취소하시겠습니까?")) return;

    const { error } = await supabase
      .from("payment_requests")
      .update({
        approval_status: 'rejected',
        status: 'inactive',
      })
      .eq("id", requestId);

    if (error) {
      console.error("Error canceling request:", error);
      toast.error("요청 취소 실패");
      return;
    }

    toast.success("요청이 취소되었습니다.");
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'completed': return 'primary';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'pending': return '승인 대기';
      case 'approved': return '승인됨';
      case 'rejected': return '거부됨';
      case 'completed': return '송금 완료';
      default: return status;
    }
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
                onPress={onOpen}
                className="bg-blue-500 text-white"
              >
                결제 요청
              </Button>
              <div className="flex gap-3 flex-wrap">
                <Select
                  placeholder="상태"
                  className="w-40"
                  defaultSelectedKeys={["all"]}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <SelectItem key="all" value="all">전체</SelectItem>
                  <SelectItem key="pending" value="pending">승인 대기</SelectItem>
                  <SelectItem key="approved" value="approved">승인됨</SelectItem>
                  <SelectItem key="rejected" value="rejected">거부됨</SelectItem>
                  <SelectItem key="completed" value="completed">송금 완료</SelectItem>
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
                  placeholder="제목 또는 내용 검색..."
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <Table aria-label="Payment requests table" className="min-w-[1200px]">
                <TableHeader>
                  <TableColumn className="text-center whitespace-nowrap">요청일</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">항목</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">제목</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">금액</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">수취인</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">요청자</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">승인자</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">상태</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">관리</TableColumn>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.request_date}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Chip variant="flat" size="sm" color="secondary">
                          {paymentTypes[item.payment_type]}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.title}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap font-bold">
                        {formatPrice(item.amount, item.currency)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.recipient_name || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.profiles?.name || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.staff?.profiles?.name || '-'}
                        <br />
                        <span className="text-xs text-gray-500">
                          ({item.approver_position})
                        </span>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Chip
                          color={getStatusColor(item.approval_status)}
                          variant="flat"
                          size="sm"
                        >
                          {getStatusLabel(item.approval_status)}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="flex gap-2 justify-center">
                          <Button
                            onPress={() => {
                              onDetailOpen();
                              setSelectData(item);
                            }}
                            size="sm"
                            variant="bordered"
                            color="primary"
                          >
                            상세
                          </Button>
                          {item.approval_status === 'pending' && (
                            <Button
                              onPress={() => handleCancelRequest(item.id)}
                              size="sm"
                              variant="bordered"
                              color="danger"
                            >
                              취소
                            </Button>
                          )}
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

          {/* 결제 요청 생성 모달 */}
          <Modal size={"3xl"} isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside">
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>결제 요청 생성</ModalHeader>
                  <ModalBody className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">결제 항목 *</h1>
                      <Select
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, payment_type: e.target.value })
                        }
                        selectedKeys={[newRequest.payment_type]}
                        className="w-full"
                      >
                        {Object.entries(paymentTypes).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">제목 *</h1>
                      <Input
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, title: e.target.value })
                        }
                        value={newRequest.title}
                        className="w-full"
                        type="text"
                        placeholder="예: 2024 현대 아반떼 계약금"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">금액 *</h1>
                      <Input
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, amount: e.target.value })
                        }
                        value={newRequest.amount}
                        className="w-full"
                        type="number"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">지불 예정일</h1>
                      <Input
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, payment_due_date: e.target.value })
                        }
                        value={newRequest.payment_due_date}
                        className="w-full"
                        type="date"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">수취인 이름</h1>
                      <Input
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, recipient_name: e.target.value })
                        }
                        value={newRequest.recipient_name}
                        className="w-full"
                        type="text"
                        placeholder="홍길동"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">수취 은행</h1>
                      <Input
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, recipient_bank: e.target.value })
                        }
                        value={newRequest.recipient_bank}
                        className="w-full"
                        type="text"
                        placeholder="국민은행"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">수취 계좌번호</h1>
                      <Input
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, recipient_account: e.target.value })
                        }
                        value={newRequest.recipient_account}
                        className="w-full"
                        type="text"
                        placeholder="123-456-789012"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">관련 차량</h1>
                      <Select
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, car_id: e.target.value })
                        }
                        placeholder="차량 선택 (선택사항)"
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
                      <h1 className="mb-2 font-semibold">관련 고객</h1>
                      <Select
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, customer_id: e.target.value })
                        }
                        placeholder="고객 선택 (선택사항)"
                        className="w-full"
                      >
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} ({customer.email})
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">승인자 선택 * (직급)</h1>
                      <Select
                        onChange={(e) => {
                          const selectedApprover = approvers.find(a => a.id === e.target.value);
                          setNewRequest({
                            ...newRequest,
                            approver_id: e.target.value,
                            approver_position: selectedApprover?.position || ''
                          });
                        }}
                        placeholder="승인할 관리자 선택"
                        className="w-full"
                      >
                        {approvers.map((approver) => (
                          <SelectItem key={approver.id} value={approver.id}>
                            {approver.profiles?.name} - {approver.position} ({approver.employee_number})
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">선택된 직급</h1>
                      <Input
                        value={newRequest.approver_position}
                        className="w-full"
                        disabled
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">상세 설명</h1>
                      <Textarea
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, description: e.target.value })
                        }
                        value={newRequest.description}
                        className="w-full"
                        placeholder="결제 요청 상세 내용..."
                        rows={4}
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
                        handleCreateRequest();
                        onClose();
                      }}
                    >
                      요청 생성
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          {/* 결제 요청 상세 모달 */}
          <Modal size={"2xl"} isOpen={isDetailOpen} onOpenChange={onDetailOpenChange}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>결제 요청 상세</ModalHeader>
                  <ModalBody className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">제목</h1>
                      <Input value={selectData?.title || ""} disabled className="w-full" />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">결제 항목</h1>
                      <Input
                        value={paymentTypes[selectData?.payment_type] || ""}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">금액</h1>
                      <Input
                        value={formatPrice(selectData?.amount, selectData?.currency)}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">요청일</h1>
                      <Input value={selectData?.request_date || ""} disabled className="w-full" />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">지불 예정일</h1>
                      <Input value={selectData?.payment_due_date || "-"} disabled className="w-full" />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">수취인</h1>
                      <Input value={selectData?.recipient_name || "-"} disabled className="w-full" />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">은행</h1>
                      <Input value={selectData?.recipient_bank || "-"} disabled className="w-full" />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">계좌번호</h1>
                      <Input value={selectData?.recipient_account || "-"} disabled className="w-full" />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">요청자</h1>
                      <Input value={selectData?.profiles?.name || "-"} disabled className="w-full" />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">승인자</h1>
                      <Input
                        value={`${selectData?.staff?.profiles?.name || '-'} (${selectData?.approver_position})`}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">상태</h1>
                      <Chip
                        color={getStatusColor(selectData?.approval_status)}
                        variant="flat"
                        size="lg"
                        className="w-full justify-center"
                      >
                        {getStatusLabel(selectData?.approval_status)}
                      </Chip>
                    </div>
                    {selectData?.approval_comment && (
                      <div className="col-span-2">
                        <h1 className="mb-2 font-semibold">승인자 코멘트</h1>
                        <Textarea
                          value={selectData.approval_comment}
                          disabled
                          className="w-full"
                        />
                      </div>
                    )}
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">상세 설명</h1>
                      <Textarea
                        value={selectData?.description || "-"}
                        disabled
                        className="w-full"
                      />
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      className="bg-gray-500"
                      color="default"
                      variant="bordered"
                      onPress={onClose}
                    >
                      닫기
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

export default PaymentRequests;

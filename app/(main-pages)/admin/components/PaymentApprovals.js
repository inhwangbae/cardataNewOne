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

function PaymentApprovals({ session, language }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const supabase = createClient();
  const [data, setData] = useState([]);
  const [currentStaff, setCurrentStaff] = useState(null);

  const [count, setCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState("1");
  const [selectData, setSelectData] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 10;
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  // 승인 처리
  const [approvalData, setApprovalData] = useState({
    action: "approved",
    comment: "",
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

  const getCurrentStaff = async () => {
    // 현재 로그인한 사용자의 staff 정보 가져오기
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("profile_id", session?.user?.id)
      .single();

    if (error) {
      console.error("Error fetching current staff:", error);
      return;
    }
    setCurrentStaff(data);
  };

  const getData = async () => {
    if (!currentStaff) return;

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
      .eq("approver_id", currentStaff.id) // 나에게 할당된 요청만
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
      console.error("Error fetching approval requests:", error);
      toast.error("승인 요청을 불러오는데 실패했습니다.");
      return;
    }
    setData(data);
    setCount(count);
    setTotalPages(Math.ceil(count / itemsPerPage));
    setIsLoading(false);
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
    getCurrentStaff();
  }, [session]);

  useEffect(() => {
    if (currentStaff) {
      getData();
    }
  }, [currentPage, debouncedSearchValue, filterStatus, currentStaff]);

  const handleApproval = async (action) => {
    if (!selectData) return;

    // 1. payment_requests 업데이트
    const { error: updateError } = await supabase
      .from("payment_requests")
      .update({
        approval_status: action,
        approval_date: new Date().toISOString(),
        approval_comment: approvalData.comment,
      })
      .eq("id", selectData.id);

    if (updateError) {
      console.error("Error updating approval:", updateError);
      toast.error("승인 처리 실패: " + updateError.message);
      return;
    }

    // 2. payment_approvals 히스토리에 기록
    const { error: historyError } = await supabase
      .from("payment_approvals")
      .insert([{
        payment_request_id: selectData.id,
        approver_staff_id: currentStaff.id,
        approver_position: currentStaff.position,
        action: action,
        comment: approvalData.comment,
      }]);

    if (historyError) {
      console.error("Error creating approval history:", historyError);
    }

    toast.success(action === 'approved' ? "승인 완료되었습니다." : "거부 처리되었습니다.");
    setApprovalData({
      action: "approved",
      comment: "",
    });
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

          {/* 승인자 정보 */}
          {currentStaff && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold text-lg mb-2">승인자 정보</h3>
              <p>이름: {currentStaff.profiles?.name || session?.user?.email}</p>
              <p>직급: {currentStaff.position}</p>
              <p>사번: {currentStaff.employee_number}</p>
            </div>
          )}

          <div className="flex flex-col gap-y-5">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="text-xl font-bold">나에게 할당된 결제 요청</h2>
              <div className="flex gap-3 flex-wrap">
                <Select
                  placeholder="상태"
                  className="w-40"
                  defaultSelectedKeys={["pending"]}
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
              <Table aria-label="Payment approval table" className="min-w-[1200px]">
                <TableHeader>
                  <TableColumn className="text-center whitespace-nowrap">요청일</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">항목</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">제목</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">금액</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">수취인</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">요청자</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">지불 예정일</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">상태</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">승인</TableColumn>
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
                      <TableCell className="text-center whitespace-nowrap font-bold text-lg">
                        {formatPrice(item.amount, item.currency)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.recipient_name || '-'}
                        <br />
                        <span className="text-xs text-gray-500">
                          {item.recipient_bank} {item.recipient_account}
                        </span>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.profiles?.name || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.payment_due_date || '-'}
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
                        {item.approval_status === 'pending' ? (
                          <Button
                            onPress={() => {
                              onOpen();
                              setSelectData(item);
                            }}
                            size="sm"
                            color="primary"
                          >
                            승인 처리
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {item.approval_date ? new Date(item.approval_date).toLocaleDateString() : '-'}
                          </span>
                        )}
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

          {/* 승인 처리 모달 */}
          <Modal size={"2xl"} isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>결제 승인 처리</ModalHeader>
                  <ModalBody className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 p-4 bg-yellow-50 rounded-lg">
                      <h3 className="font-bold text-lg mb-2">결제 요청 정보</h3>
                      <p><strong>제목:</strong> {selectData?.title}</p>
                      <p><strong>항목:</strong> {paymentTypes[selectData?.payment_type]}</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        <strong>금액:</strong> {formatPrice(selectData?.amount, selectData?.currency)}
                      </p>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">요청자</h1>
                      <Input value={selectData?.profiles?.name || "-"} disabled className="w-full" />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">요청일</h1>
                      <Input value={selectData?.request_date || ""} disabled className="w-full" />
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
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">상세 설명</h1>
                      <Textarea
                        value={selectData?.description || "-"}
                        disabled
                        className="w-full"
                        rows={3}
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">승인 의견</h1>
                      <Textarea
                        onChange={(e) =>
                          setApprovalData({ ...approvalData, comment: e.target.value })
                        }
                        value={approvalData.comment}
                        className="w-full"
                        placeholder="승인/거부 사유를 입력하세요..."
                        rows={3}
                      />
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      className="bg-red-500 text-white"
                      onPress={() => {
                        handleApproval('rejected');
                        onClose();
                      }}
                    >
                      거부
                    </Button>
                    <Button
                      className="bg-gray-500"
                      color="default"
                      variant="bordered"
                      onPress={onClose}
                    >
                      취소
                    </Button>
                    <Button
                      className="bg-green-500 text-white"
                      onPress={() => {
                        handleApproval('approved');
                        onClose();
                      }}
                    >
                      승인
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

export default PaymentApprovals;

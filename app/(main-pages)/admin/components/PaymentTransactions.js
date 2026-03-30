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

function PaymentTransactions({ session, language }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onOpenChange: onDetailOpenChange } = useDisclosure();
  const supabase = createClient();
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [count, setCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState("1");
  const [selectData, setSelectData] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const itemsPerPage = 10;
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const [view, setView] = useState("approved"); // approved 또는 completed

  // 송금 처리
  const [transactionData, setTransactionData] = useState({
    transaction_type: "withdrawal",
    notes: "",
    receipt_file: null,
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

  const getApprovedRequests = async () => {
    let query = supabase
      .from("payment_requests")
      .select(`
        *,
        profiles:requester_id (
          name,
          email
        ),
        staff:approver_id (
          employee_number,
          profiles:profile_id (
            name
          )
        )
      `, { count: "exact" })
      .eq("approval_status", "approved")
      .order("approval_date", { ascending: false })
      .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

    if (searchValue) {
      query = query.or(`title.ilike.%${searchValue}%,recipient_name.ilike.%${searchValue}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching approved requests:", error);
      toast.error("승인된 요청을 불러오는데 실패했습니다.");
      return;
    }
    setApprovedRequests(data);
    setCount(count);
    setTotalPages(Math.ceil(count / itemsPerPage));
    setIsLoading(false);
  };

  const getCompletedTransactions = async () => {
    let query = supabase
      .from("payment_transactions")
      .select(`
        *,
        payment_requests:payment_request_id (
          title,
          payment_type,
          amount,
          currency,
          recipient_name
        ),
        profiles:processed_by (
          name
        )
      `, { count: "exact" })
      .order("transaction_date", { ascending: false })
      .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

    if (searchValue) {
      query = query.or(`notes.ilike.%${searchValue}%,account_holder.ilike.%${searchValue}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
      toast.error("거래 내역을 불러오는데 실패했습니다.");
      return;
    }
    setTransactions(data);
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
    if (view === "approved") {
      getApprovedRequests();
    } else {
      getCompletedTransactions();
    }
  }, [currentPage, debouncedSearchValue, view]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTransactionData({
        ...transactionData,
        receipt_file: file,
      });
    }
  };

  const handleCompleteTransaction = async () => {
    if (!transactionData.receipt_file) {
      toast.error("송금증을 업로드해주세요.");
      return;
    }

    setUploading(true);

    try {
      // 1. 송금증 업로드
      const fileExt = transactionData.receipt_file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `payment-receipts/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('car-documents')
        .upload(filePath, transactionData.receipt_file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("송금증 업로드 실패: " + uploadError.message);
        setUploading(false);
        return;
      }

      // 2. 공개 URL 가져오기
      const { data: urlData } = supabase.storage
        .from('car-documents')
        .getPublicUrl(filePath);

      // 3. payment_transactions 레코드 생성
      const { error: txError } = await supabase
        .from("payment_transactions")
        .insert([{
          payment_request_id: selectData.id,
          transaction_type: transactionData.transaction_type,
          amount: selectData.amount,
          currency: selectData.currency,
          account_holder: selectData.recipient_name,
          bank_name: selectData.recipient_bank,
          account_number: selectData.recipient_account,
          receipt_url: urlData.publicUrl,
          receipt_file_name: transactionData.receipt_file.name,
          processed_by: session?.user?.id,
          notes: transactionData.notes,
        }]);

      if (txError) {
        console.error("Error creating transaction:", txError);
        toast.error("거래 생성 실패: " + txError.message);
        setUploading(false);
        return;
      }

      // 4. payment_requests 상태 업데이트
      const { error: updateError } = await supabase
        .from("payment_requests")
        .update({
          approval_status: 'completed',
        })
        .eq("id", selectData.id);

      if (updateError) {
        console.error("Error updating request:", updateError);
      }

      toast.success("송금 완료 처리되었습니다.");
      setTransactionData({
        transaction_type: "withdrawal",
        notes: "",
        receipt_file: null,
      });
      getApprovedRequests();
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error("처리 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const formatPrice = (price, currency = "KRW") => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency,
    }).format(price);
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
              <div className="flex gap-2">
                <Button
                  onPress={() => setView("approved")}
                  className={view === "approved" ? "bg-blue-500 text-white" : ""}
                  variant={view === "approved" ? "solid" : "bordered"}
                >
                  승인된 요청 ({count})
                </Button>
                <Button
                  onPress={() => setView("completed")}
                  className={view === "completed" ? "bg-green-500 text-white" : ""}
                  variant={view === "completed" ? "solid" : "bordered"}
                >
                  완료된 거래
                </Button>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Input
                  startContent={
                    <SearchIcon className="text-black/50 mb-0.5 text-slate-400 pointer-events-none flex-shrink-0" />
                  }
                  onChange={handleSearchChange}
                  value={searchValue}
                  className="w-60"
                  type="text"
                  variant="bordered"
                  placeholder="검색..."
                />
              </div>
            </div>

            {/* 승인된 요청 테이블 */}
            {view === "approved" && (
              <div className="w-full overflow-x-auto">
                <Table aria-label="Approved requests table" className="min-w-[1200px]">
                  <TableHeader>
                    <TableColumn className="text-center whitespace-nowrap">승인일</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">항목</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">제목</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">금액</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">수취인</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">은행/계좌</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">승인자</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">송금 처리</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {approvedRequests.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-center whitespace-nowrap">
                          {item.approval_date ? new Date(item.approval_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Chip variant="flat" size="sm" color="secondary">
                            {paymentTypes[item.payment_type]}
                          </Chip>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {item.title}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap font-bold text-lg text-green-600">
                          {formatPrice(item.amount, item.currency)}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {item.recipient_name || '-'}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {item.recipient_bank || '-'}
                          <br />
                          <span className="text-xs text-gray-500">
                            {item.recipient_account || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {item.staff?.profiles?.name || '-'}
                          <br />
                          <span className="text-xs text-gray-500">
                            ({item.approver_position})
                          </span>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Button
                            onPress={() => {
                              onOpen();
                              setSelectData(item);
                            }}
                            size="sm"
                            color="success"
                            className="text-white"
                          >
                            송금 완료
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 완료된 거래 테이블 */}
            {view === "completed" && (
              <div className="w-full overflow-x-auto">
                <Table aria-label="Completed transactions table" className="min-w-[1200px]">
                  <TableHeader>
                    <TableColumn className="text-center whitespace-nowrap">거래일</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">항목</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">제목</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">금액</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">수취인</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">처리자</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">송금증</TableColumn>
                    <TableColumn className="text-center whitespace-nowrap">상세</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-center whitespace-nowrap">
                          {new Date(item.transaction_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Chip variant="flat" size="sm" color="secondary">
                            {paymentTypes[item.payment_requests?.payment_type]}
                          </Chip>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {item.payment_requests?.title || '-'}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap font-bold text-blue-600">
                          {formatPrice(item.amount, item.currency)}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {item.account_holder || '-'}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {item.profiles?.name || '-'}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {item.receipt_url ? (
                            <Button
                              as="a"
                              href={item.receipt_url}
                              target="_blank"
                              size="sm"
                              variant="bordered"
                              color="primary"
                            >
                              보기
                            </Button>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Button
                            onPress={() => {
                              onDetailOpen();
                              setSelectData(item);
                            }}
                            size="sm"
                            variant="bordered"
                            color="secondary"
                          >
                            상세
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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

          {/* 송금 완료 모달 */}
          <Modal size={"2xl"} isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>송금 완료 처리</ModalHeader>
                  <ModalBody className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-bold text-lg mb-2">결제 정보</h3>
                      <p><strong>제목:</strong> {selectData?.title}</p>
                      <p><strong>항목:</strong> {paymentTypes[selectData?.payment_type]}</p>
                      <p className="text-2xl font-bold text-green-600 mt-2">
                        <strong>금액:</strong> {formatPrice(selectData?.amount, selectData?.currency)}
                      </p>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">수취인</h1>
                      <Input value={selectData?.recipient_name || "-"} disabled className="w-full" />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">은행</h1>
                      <Input value={selectData?.recipient_bank || "-"} disabled className="w-full" />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">계좌번호</h1>
                      <Input value={selectData?.recipient_account || "-"} disabled className="w-full" />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">거래 유형</h1>
                      <Select
                        onChange={(e) =>
                          setTransactionData({ ...transactionData, transaction_type: e.target.value })
                        }
                        selectedKeys={[transactionData.transaction_type]}
                        className="w-full"
                      >
                        <SelectItem key="withdrawal" value="withdrawal">
                          출금 (송금)
                        </SelectItem>
                        <SelectItem key="deposit" value="deposit">
                          입금
                        </SelectItem>
                      </Select>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">송금증 업로드 *</h1>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="w-full p-2 border rounded"
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        지원 형식: PDF, JPG, PNG
                      </p>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">메모</h1>
                      <Textarea
                        onChange={(e) =>
                          setTransactionData({ ...transactionData, notes: e.target.value })
                        }
                        value={transactionData.notes}
                        className="w-full"
                        placeholder="거래 관련 메모..."
                        rows={3}
                      />
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      className="bg-red-500"
                      color="danger"
                      variant="bordered"
                      onPress={onClose}
                      disabled={uploading}
                    >
                      취소
                    </Button>
                    <Button
                      className="bg-green-500 text-white"
                      onPress={() => {
                        handleCompleteTransaction();
                        onClose();
                      }}
                      disabled={uploading}
                    >
                      {uploading ? <Spinner size="sm" color="white" /> : "송금 완료"}
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          {/* 거래 상세 모달 */}
          <Modal size={"2xl"} isOpen={isDetailOpen} onOpenChange={onDetailOpenChange}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>거래 상세 정보</ModalHeader>
                  <ModalBody className="grid grid-cols-2 gap-4">
                    <div>
                      <h1 className="mb-2 font-semibold">거래일</h1>
                      <Input
                        value={selectData?.transaction_date ? new Date(selectData.transaction_date).toLocaleString() : '-'}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">거래 유형</h1>
                      <Input
                        value={selectData?.transaction_type === 'withdrawal' ? '출금' : '입금'}
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
                      <h1 className="mb-2 font-semibold">계좌주</h1>
                      <Input
                        value={selectData?.account_holder || "-"}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">은행</h1>
                      <Input
                        value={selectData?.bank_name || "-"}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">계좌번호</h1>
                      <Input
                        value={selectData?.account_number || "-"}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">처리자</h1>
                      <Input
                        value={selectData?.profiles?.name || "-"}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">처리일시</h1>
                      <Input
                        value={selectData?.processed_at ? new Date(selectData.processed_at).toLocaleString() : '-'}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">메모</h1>
                      <Textarea
                        value={selectData?.notes || "-"}
                        disabled
                        className="w-full"
                      />
                    </div>
                    {selectData?.receipt_url && (
                      <div className="col-span-2">
                        <Button
                          as="a"
                          href={selectData.receipt_url}
                          target="_blank"
                          className="w-full bg-blue-500 text-white"
                        >
                          송금증 다운로드
                        </Button>
                      </div>
                    )}
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

export default PaymentTransactions;

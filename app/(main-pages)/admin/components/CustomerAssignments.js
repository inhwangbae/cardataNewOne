"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Pagination } from "@nextui-org/react";
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

function CustomerAssignments({ session, language }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const supabase = createClient();
  const [data, setData] = useState([]);
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [count, setCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState("1");
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 10;
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  // 새 할당 추가용 상태
  const [newAssignment, setNewAssignment] = useState({
    customer_id: "",
    staff_id: "",
    notes: "",
  });

  const getData = async () => {
    let query = supabase
      .from("customer_assignments")
      .select(`
        *,
        profiles:customer_id (
          id,
          name,
          email,
          phone
        ),
        staff:staff_id (
          id,
          employee_number,
          profiles:profile_id (
            name
          )
        )
      `, { count: "exact" })
      .eq("status", "active")
      .order("assigned_date", { ascending: false })
      .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

    if (searchValue) {
      query = query.or(`profiles.name.ilike.%${searchValue}%,profiles.email.ilike.%${searchValue}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching assignments:", error);
      toast.error("할당 데이터를 불러오는데 실패했습니다.");
      return;
    }
    setData(data);
    setCount(count);
    setTotalPages(Math.ceil(count / itemsPerPage));
    setIsLoading(false);
  };

  const getRelatedData = async () => {
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

    // 고객 목록 (아직 할당되지 않은 고객)
    const { data: customersData } = await supabase
      .from("profiles")
      .select("id, name, email, phone")
      .eq("role", "client")
      .order("name");
    setCustomers(customersData || []);
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
  }, [currentPage, debouncedSearchValue]);

  useEffect(() => {
    getRelatedData();
  }, []);

  const handleAddAssignment = async () => {
    if (!newAssignment.customer_id || !newAssignment.staff_id) {
      toast.error("고객과 담당 직원을 선택해주세요.");
      return;
    }

    // 이미 할당되어 있는지 확인
    const { data: existing } = await supabase
      .from("customer_assignments")
      .select("id")
      .eq("customer_id", newAssignment.customer_id)
      .eq("staff_id", newAssignment.staff_id)
      .eq("status", "active")
      .single();

    if (existing) {
      toast.error("이미 해당 직원에게 할당된 고객입니다.");
      return;
    }

    const { data, error } = await supabase
      .from("customer_assignments")
      .insert([{
        customer_id: newAssignment.customer_id,
        staff_id: newAssignment.staff_id,
        assigned_date: new Date().toISOString().split('T')[0],
        status: 'active',
        notes: newAssignment.notes,
      }]);

    if (error) {
      console.error("Error adding assignment:", error);
      toast.error("할당 추가 실패: " + error.message);
      return;
    }

    toast.success("고객 할당 완료");
    setNewAssignment({
      customer_id: "",
      staff_id: "",
      notes: "",
    });
    getData();
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!confirm("정말 할당을 해제하시겠습니까?")) return;

    const { error } = await supabase
      .from("customer_assignments")
      .update({ status: 'inactive' })
      .eq("id", assignmentId);

    if (error) {
      console.error("Error removing assignment:", error);
      toast.error("할당 해제 실패");
      return;
    }

    toast.success("할당 해제 완료");
    getData();
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
            <div className="flex justify-between items-center">
              <Button
                onPress={onOpen}
                className="bg-blue-500 text-white"
              >
                고객 할당
              </Button>
              <div className="flex gap-3">
                <Input
                  startContent={
                    <SearchIcon className="text-black/50 mb-0.5 text-slate-400 pointer-events-none flex-shrink-0" />
                  }
                  onChange={handleSearchChange}
                  value={searchValue}
                  className="w-60"
                  type="text"
                  variant="bordered"
                  placeholder="고객 이름 또는 이메일 검색..."
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <Table aria-label="Customer assignments table" className="min-w-[1000px]">
                <TableHeader>
                  <TableColumn className="text-center whitespace-nowrap">할당일</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">고객명</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">이메일</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">전화번호</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">담당 직원</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">사번</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">메모</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">관리</TableColumn>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.assigned_date}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.profiles?.name || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.profiles?.email || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.profiles?.phone || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.staff?.profiles?.name || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.staff?.employee_number || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.notes || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Button
                          onPress={() => handleRemoveAssignment(item.id)}
                          size="sm"
                          variant="bordered"
                          color="danger"
                        >
                          할당 해제
                        </Button>
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

          {/* 고객 할당 모달 */}
          <Modal size={"lg"} isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    고객 할당
                  </ModalHeader>
                  <ModalBody className="grid grid-cols-1 gap-4">
                    <div>
                      <h1 className="mb-2 font-semibold">고객 선택 *</h1>
                      <Select
                        onChange={(e) =>
                          setNewAssignment({ ...newAssignment, customer_id: e.target.value })
                        }
                        placeholder="고객을 선택하세요"
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
                      <h1 className="mb-2 font-semibold">담당 직원 *</h1>
                      <Select
                        onChange={(e) =>
                          setNewAssignment({ ...newAssignment, staff_id: e.target.value })
                        }
                        placeholder="직원을 선택하세요"
                        className="w-full"
                      >
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.profiles?.name} ({s.employee_number})
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">메모</h1>
                      <Textarea
                        onChange={(e) =>
                          setNewAssignment({ ...newAssignment, notes: e.target.value })
                        }
                        value={newAssignment.notes}
                        className="w-full"
                        placeholder="할당 관련 메모..."
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
                        handleAddAssignment();
                        onClose();
                      }}
                    >
                      할당
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

export default CustomerAssignments;

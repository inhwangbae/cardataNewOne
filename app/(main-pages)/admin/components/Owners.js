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

function Owners({ session, language }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onOpenChange: onAddOpenChange } = useDisclosure();
  const supabase = createClient();
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState("1");
  const [selectData, setSelectData] = useState(null);
  const [searchCategory, setSearchCategory] = useState("name");
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 10;
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  // 새 소유주 추가용 상태
  const [newOwner, setNewOwner] = useState({
    name: "",
    name_en: "",
    phone: "",
    email: "",
    address: "",
    address_en: "",
    id_number: "",
    company_name: "",
    bank_name: "",
    bank_account: "",
    notes: "",
  });

  const getData = async () => {
    let query = supabase
      .from("owners")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

    if (searchValue) {
      query = query.ilike(searchCategory, `%${searchValue}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching owners:", error);
      toast.error("소유주 데이터를 불러오는데 실패했습니다.");
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
    getData();
  }, [currentPage, debouncedSearchValue]);

  const handleSubmit = async (selectData) => {
    const { data, error } = await supabase
      .from("owners")
      .update({
        name: selectData.name,
        name_en: selectData.name_en,
        phone: selectData.phone,
        email: selectData.email,
        address: selectData.address,
        address_en: selectData.address_en,
        id_number: selectData.id_number,
        company_name: selectData.company_name,
        bank_name: selectData.bank_name,
        bank_account: selectData.bank_account,
        notes: selectData.notes,
      })
      .eq("id", selectData.id);

    if (error) {
      console.error("Error updating owner:", error);
      toast.error("소유주 정보 수정 실패");
      return;
    }
    toast.success("소유주 정보 수정 완료");
    getData();
  };

  const handleAddOwner = async () => {
    if (!newOwner.name || !newOwner.phone) {
      toast.error("이름과 전화번호는 필수 항목입니다.");
      return;
    }

    const { data, error } = await supabase
      .from("owners")
      .insert([newOwner]);

    if (error) {
      console.error("Error adding owner:", error);
      toast.error("소유주 추가 실패: " + error.message);
      return;
    }

    toast.success("소유주 추가 완료");
    setNewOwner({
      name: "",
      name_en: "",
      phone: "",
      email: "",
      address: "",
      address_en: "",
      id_number: "",
      company_name: "",
      bank_name: "",
      bank_account: "",
      notes: "",
    });
    getData();
  };

  const handleDeleteOwner = async (ownerId) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("owners")
      .delete()
      .eq("id", ownerId);

    if (error) {
      console.error("Error deleting owner:", error);
      toast.error("소유주 삭제 실패");
      return;
    }

    toast.success("소유주 삭제 완료");
    getData();
  };

  const handleCancel = () => {
    setSelectData(null);
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
                onPress={onAddOpen}
                className="bg-blue-500 text-white"
              >
                소유주 추가
              </Button>
              <div className="flex gap-3">
                <Select
                  placeholder="category"
                  className="max-w-xs w-40"
                  defaultSelectedKeys={["name"]}
                  onChange={(e) => setSearchCategory(e.target.value)}
                >
                  <SelectItem key="name" value="name">
                    이름
                  </SelectItem>
                  <SelectItem key="phone" value="phone">
                    전화번호
                  </SelectItem>
                  <SelectItem key="email" value="email">
                    이메일
                  </SelectItem>
                  <SelectItem key="company_name" value="company_name">
                    법인명
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
                  placeholder="검색..."
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <Table aria-label="Owners table" className="min-w-[1000px]">
                <TableHeader>
                  <TableColumn className="text-center whitespace-nowrap">이름</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">전화번호</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">이메일</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">주소</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">법인명</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">은행</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">계좌번호</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">관리</TableColumn>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.phone || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.email || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.address || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.company_name || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.bank_name || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.bank_account || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="flex gap-2 justify-center">
                          <Button
                            onPress={() => {
                              onOpen();
                              setSelectData(item);
                            }}
                            size="sm"
                            variant="bordered"
                            color="primary"
                          >
                            수정
                          </Button>
                          <Button
                            onPress={() => handleDeleteOwner(item.id)}
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

          {/* 소유주 수정 모달 */}
          <Modal size={"3xl"} isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside">
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    소유주 정보 수정
                  </ModalHeader>
                  <ModalBody className="grid grid-cols-2 gap-4">
                    <div>
                      <h1 className="mb-2 font-semibold">이름 *</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, name: e.target.value })
                        }
                        value={selectData?.name || ""}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">영문 이름</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, name_en: e.target.value })
                        }
                        value={selectData?.name_en || ""}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">전화번호 *</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, phone: e.target.value })
                        }
                        value={selectData?.phone || ""}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">이메일</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, email: e.target.value })
                        }
                        value={selectData?.email || ""}
                        className="w-full"
                        type="email"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">주소</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, address: e.target.value })
                        }
                        value={selectData?.address || ""}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">영문 주소</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, address_en: e.target.value })
                        }
                        value={selectData?.address_en || ""}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">주민등록번호/사업자번호</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, id_number: e.target.value })
                        }
                        value={selectData?.id_number || ""}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">법인명</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, company_name: e.target.value })
                        }
                        value={selectData?.company_name || ""}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">은행명</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, bank_name: e.target.value })
                        }
                        value={selectData?.bank_name || ""}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">계좌번호</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, bank_account: e.target.value })
                        }
                        value={selectData?.bank_account || ""}
                        className="w-full"
                        type="text"
                      />
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
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      className="bg-red-500"
                      color="danger"
                      variant="bordered"
                      onPress={() => {
                        onClose();
                        handleCancel();
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      className="text-white"
                      color="primary"
                      onPress={() => {
                        onClose();
                        handleSubmit(selectData);
                      }}
                    >
                      확인
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          {/* 소유주 추가 모달 */}
          <Modal size={"3xl"} isOpen={isAddOpen} onOpenChange={onAddOpenChange} scrollBehavior="inside">
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    소유주 추가
                  </ModalHeader>
                  <ModalBody className="grid grid-cols-2 gap-4">
                    <div>
                      <h1 className="mb-2 font-semibold">이름 *</h1>
                      <Input
                        onChange={(e) =>
                          setNewOwner({ ...newOwner, name: e.target.value })
                        }
                        value={newOwner.name}
                        className="w-full"
                        type="text"
                        placeholder="홍길동"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">영문 이름</h1>
                      <Input
                        onChange={(e) =>
                          setNewOwner({ ...newOwner, name_en: e.target.value })
                        }
                        value={newOwner.name_en}
                        className="w-full"
                        type="text"
                        placeholder="Hong Gildong"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">전화번호 *</h1>
                      <Input
                        onChange={(e) =>
                          setNewOwner({ ...newOwner, phone: e.target.value })
                        }
                        value={newOwner.phone}
                        className="w-full"
                        type="text"
                        placeholder="010-1234-5678"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">이메일</h1>
                      <Input
                        onChange={(e) =>
                          setNewOwner({ ...newOwner, email: e.target.value })
                        }
                        value={newOwner.email}
                        className="w-full"
                        type="email"
                        placeholder="example@email.com"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">주소</h1>
                      <Input
                        onChange={(e) =>
                          setNewOwner({ ...newOwner, address: e.target.value })
                        }
                        value={newOwner.address}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">영문 주소</h1>
                      <Input
                        onChange={(e) =>
                          setNewOwner({ ...newOwner, address_en: e.target.value })
                        }
                        value={newOwner.address_en}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">주민등록번호/사업자번호</h1>
                      <Input
                        onChange={(e) =>
                          setNewOwner({ ...newOwner, id_number: e.target.value })
                        }
                        value={newOwner.id_number}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">법인명</h1>
                      <Input
                        onChange={(e) =>
                          setNewOwner({ ...newOwner, company_name: e.target.value })
                        }
                        value={newOwner.company_name}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">은행명</h1>
                      <Input
                        onChange={(e) =>
                          setNewOwner({ ...newOwner, bank_name: e.target.value })
                        }
                        value={newOwner.bank_name}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">계좌번호</h1>
                      <Input
                        onChange={(e) =>
                          setNewOwner({ ...newOwner, bank_account: e.target.value })
                        }
                        value={newOwner.bank_account}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">메모</h1>
                      <Textarea
                        onChange={(e) =>
                          setNewOwner({ ...newOwner, notes: e.target.value })
                        }
                        value={newOwner.notes}
                        className="w-full"
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
                        handleAddOwner();
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

export default Owners;

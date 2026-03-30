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
} from "@nextui-org/react";
import { SearchIcon } from "./SearchIcon";
import { Select, SelectItem } from "@nextui-org/select";
import debounce from "lodash/debounce";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Spinner } from "@nextui-org/react";

function Staff({ session, language }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onOpenChange: onAddOpenChange } = useDisclosure();
  const supabase = createClient();
  const [data, setData] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [count, setCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState("1");
  const [selectData, setSelectData] = useState(null);
  const [searchCategory, setSearchCategory] = useState("employee_number");
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 10;
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  // 새 직원 추가용 상태
  const [newStaff, setNewStaff] = useState({
    profile_id: "",
    employee_number: "",
    position: "",
    department: "",
    hire_date: "",
    commission_rate: 0,
  });

  const getData = async () => {
    let query = supabase
      .from("staff")
      .select(`
        *,
        profiles:profile_id (
          id,
          name,
          email,
          phone
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

    if (searchValue) {
      if (searchCategory === 'name') {
        // profiles 테이블의 name으로 검색
        query = query.ilike('profiles.name', `%${searchValue}%`);
      } else {
        query = query.ilike(searchCategory, `%${searchValue}%`);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching staff data:", error);
      toast.error("직원 데이터를 불러오는데 실패했습니다.");
      return;
    }
    setData(data);
    setCount(count);
    setTotalPages(Math.ceil(count / itemsPerPage));
    setIsLoading(false);
  };

  const getAvailableProfiles = async () => {
    // staff 테이블에 없는 profiles만 가져오기
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("role", "master") // 또는 다른 조건
      .order("name");

    if (error) {
      console.error("Error fetching profiles:", error);
      return;
    }

    // staff 테이블에 이미 등록된 profile_id 제외
    const { data: existingStaff } = await supabase
      .from("staff")
      .select("profile_id");

    const existingProfileIds = existingStaff?.map(s => s.profile_id) || [];
    const availableProfiles = data?.filter(p => !existingProfileIds.includes(p.id)) || [];

    setProfiles(availableProfiles);
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
    getAvailableProfiles();
  }, []);

  const handleSubmit = async (selectData) => {
    const { data, error } = await supabase
      .from("staff")
      .update({
        employee_number: selectData.employee_number,
        position: selectData.position,
        department: selectData.department,
        hire_date: selectData.hire_date,
        status: selectData.status,
        commission_rate: parseFloat(selectData.commission_rate),
      })
      .eq("id", selectData.id);

    if (error) {
      console.error("Error updating staff:", error);
      toast.error("직원 정보 수정 실패");
      return;
    }
    toast.success("직원 정보 수정 완료");
    getData();
  };

  const handleAddStaff = async () => {
    if (!newStaff.profile_id || !newStaff.employee_number) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }

    const { data, error } = await supabase
      .from("staff")
      .insert([{
        profile_id: newStaff.profile_id,
        employee_number: newStaff.employee_number,
        position: newStaff.position,
        department: newStaff.department,
        hire_date: newStaff.hire_date || new Date().toISOString().split('T')[0],
        commission_rate: parseFloat(newStaff.commission_rate),
        status: 'active',
      }]);

    if (error) {
      console.error("Error adding staff:", error);
      toast.error("직원 추가 실패: " + error.message);
      return;
    }

    toast.success("직원 추가 완료");
    setNewStaff({
      profile_id: "",
      employee_number: "",
      position: "",
      department: "",
      hire_date: "",
      commission_rate: 0,
    });
    getData();
    getAvailableProfiles();
  };

  const handleDeleteStaff = async (staffId) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("staff")
      .delete()
      .eq("id", staffId);

    if (error) {
      console.error("Error deleting staff:", error);
      toast.error("직원 삭제 실패");
      return;
    }

    toast.success("직원 삭제 완료");
    getData();
    getAvailableProfiles();
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
                직원 추가
              </Button>
              <div className="flex gap-3">
                <Select
                  placeholder="category"
                  className="max-w-xs w-40"
                  defaultSelectedKeys={["employee_number"]}
                  onChange={(e) => setSearchCategory(e.target.value)}
                >
                  <SelectItem key="employee_number" value="employee_number">
                    사번
                  </SelectItem>
                  <SelectItem key="name" value="name">
                    이름
                  </SelectItem>
                  <SelectItem key="position" value="position">
                    직급
                  </SelectItem>
                  <SelectItem key="department" value="department">
                    부서
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
              <Table aria-label="Staff management table" className="min-w-[1000px]">
                <TableHeader>
                  <TableColumn className="text-center whitespace-nowrap">사번</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">이름</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">이메일</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">전화번호</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">직급</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">부서</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">입사일</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">수수료율(%)</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">상태</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">관리</TableColumn>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.employee_number}
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
                        {item.position || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.department || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.hire_date || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.commission_rate || 0}%
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.status === 'active' ? 'bg-green-100 text-green-800' :
                          item.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.status === 'active' ? '활동중' :
                           item.status === 'inactive' ? '비활성' : '퇴사'}
                        </span>
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
                            onPress={() => handleDeleteStaff(item.id)}
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

          {/* 직원 수정 모달 */}
          <Modal size={"2xl"} isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    직원 정보 수정
                  </ModalHeader>
                  <ModalBody className="grid grid-cols-2 gap-4">
                    <div>
                      <h1 className="mb-2 font-semibold">사번</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, employee_number: e.target.value })
                        }
                        value={selectData?.employee_number || ""}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">직급</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, position: e.target.value })
                        }
                        value={selectData?.position || ""}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">부서</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, department: e.target.value })
                        }
                        value={selectData?.department || ""}
                        className="w-full"
                        type="text"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">입사일</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, hire_date: e.target.value })
                        }
                        value={selectData?.hire_date || ""}
                        className="w-full"
                        type="date"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">수수료율 (%)</h1>
                      <Input
                        onChange={(e) =>
                          setSelectData({ ...selectData, commission_rate: e.target.value })
                        }
                        value={selectData?.commission_rate || "0"}
                        className="w-full"
                        type="number"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">상태</h1>
                      <Select
                        onChange={(e) =>
                          setSelectData({ ...selectData, status: e.target.value })
                        }
                        selectedKeys={selectData?.status ? [selectData.status] : []}
                        className="w-full"
                      >
                        <SelectItem key="active" value="active">
                          활동중
                        </SelectItem>
                        <SelectItem key="inactive" value="inactive">
                          비활성
                        </SelectItem>
                        <SelectItem key="resigned" value="resigned">
                          퇴사
                        </SelectItem>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">이름</h1>
                      <Input
                        value={selectData?.profiles?.name || ""}
                        className="w-full"
                        type="text"
                        disabled
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

          {/* 직원 추가 모달 */}
          <Modal size={"2xl"} isOpen={isAddOpen} onOpenChange={onAddOpenChange}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    직원 추가
                  </ModalHeader>
                  <ModalBody className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">계정 선택 *</h1>
                      <Select
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, profile_id: e.target.value })
                        }
                        placeholder="계정을 선택하세요"
                        className="w-full"
                      >
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name} ({profile.email})
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">사번 *</h1>
                      <Input
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, employee_number: e.target.value })
                        }
                        value={newStaff.employee_number}
                        className="w-full"
                        type="text"
                        placeholder="예: EMP001"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">직급</h1>
                      <Input
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, position: e.target.value })
                        }
                        value={newStaff.position}
                        className="w-full"
                        type="text"
                        placeholder="예: 영업사원"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">부서</h1>
                      <Input
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, department: e.target.value })
                        }
                        value={newStaff.department}
                        className="w-full"
                        type="text"
                        placeholder="예: 영업팀"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">입사일</h1>
                      <Input
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, hire_date: e.target.value })
                        }
                        value={newStaff.hire_date}
                        className="w-full"
                        type="date"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">수수료율 (%)</h1>
                      <Input
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, commission_rate: e.target.value })
                        }
                        value={newStaff.commission_rate}
                        className="w-full"
                        type="number"
                        step="0.01"
                        placeholder="예: 5.00"
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
                        setNewStaff({
                          profile_id: "",
                          employee_number: "",
                          position: "",
                          department: "",
                          hire_date: "",
                          commission_rate: 0,
                        });
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      className="text-white"
                      color="primary"
                      onPress={() => {
                        handleAddStaff();
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

export default Staff;

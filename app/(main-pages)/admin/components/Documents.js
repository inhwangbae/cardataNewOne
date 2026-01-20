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

function Documents({ session, language }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onOpenChange: onAddOpenChange } = useDisclosure();
  const supabase = createClient();
  const [data, setData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cars, setCars] = useState([]);
  const [owners, setOwners] = useState([]);

  const [count, setCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState("1");
  const [selectData, setSelectData] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const itemsPerPage = 10;
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  // 새 문서 추가용 상태
  const [newDocument, setNewDocument] = useState({
    transaction_id: "",
    car_id: "",
    owner_id: "",
    document_type: "contract",
    document_name: "",
    description: "",
    file: null,
  });

  const getData = async () => {
    let query = supabase
      .from("documents")
      .select(`
        *,
        transactions:transaction_id (
          id,
          transaction_type,
          contract_number
        ),
        cardata:car_id (
          id,
          title
        ),
        owners:owner_id (
          id,
          name
        ),
        profiles:uploaded_by (
          name
        )
      `, { count: "exact" })
      .order("upload_date", { ascending: false })
      .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

    if (filterType !== "all") {
      query = query.eq("document_type", filterType);
    }

    if (searchValue) {
      query = query.or(`document_name.ilike.%${searchValue}%,description.ilike.%${searchValue}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching documents:", error);
      toast.error("문서 데이터를 불러오는데 실패했습니다.");
      return;
    }
    setData(data);
    setCount(count);
    setTotalPages(Math.ceil(count / itemsPerPage));
    setIsLoading(false);
  };

  const getRelatedData = async () => {
    // 거래 목록
    const { data: transactionsData } = await supabase
      .from("transactions")
      .select("id, transaction_type, contract_number, transaction_date")
      .order("transaction_date", { ascending: false })
      .limit(100);
    setTransactions(transactionsData || []);

    // 차량 목록
    const { data: carsData } = await supabase
      .from("cardata")
      .select("id, title")
      .order("created_at", { ascending: false })
      .limit(100);
    setCars(carsData || []);

    // 소유주 목록
    const { data: ownersData } = await supabase
      .from("owners")
      .select("id, name")
      .order("name");
    setOwners(ownersData || []);
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewDocument({
        ...newDocument,
        file: file,
        document_name: file.name,
      });
    }
  };

  const handleUploadDocument = async () => {
    if (!newDocument.file || !newDocument.document_type) {
      toast.error("파일과 문서 유형은 필수입니다.");
      return;
    }

    setUploading(true);

    try {
      // 1. Supabase Storage에 파일 업로드
      const fileExt = newDocument.file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('car-documents') // 버킷 이름 (Supabase에서 생성 필요)
        .upload(filePath, newDocument.file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("파일 업로드 실패: " + uploadError.message);
        setUploading(false);
        return;
      }

      // 2. 파일 공개 URL 가져오기
      const { data: urlData } = supabase.storage
        .from('car-documents')
        .getPublicUrl(filePath);

      // 3. documents 테이블에 메타데이터 저장
      const { data, error } = await supabase
        .from("documents")
        .insert([{
          transaction_id: newDocument.transaction_id || null,
          car_id: newDocument.car_id || null,
          owner_id: newDocument.owner_id || null,
          document_type: newDocument.document_type,
          document_name: newDocument.document_name,
          file_url: urlData.publicUrl,
          file_name: newDocument.file.name,
          file_size: newDocument.file.size,
          mime_type: newDocument.file.type,
          uploaded_by: session?.user?.id,
          description: newDocument.description,
          status: 'active',
        }]);

      if (error) {
        console.error("Error saving document metadata:", error);
        toast.error("문서 정보 저장 실패: " + error.message);
        setUploading(false);
        return;
      }

      toast.success("문서 업로드 완료");
      setNewDocument({
        transaction_id: "",
        car_id: "",
        owner_id: "",
        document_type: "contract",
        document_name: "",
        description: "",
        file: null,
      });
      getData();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (document) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      // 1. Storage에서 파일 삭제
      const filePath = document.file_url.split('/').slice(-2).join('/');
      const { error: storageError } = await supabase.storage
        .from('car-documents')
        .remove([filePath]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // 2. 데이터베이스에서 레코드 삭제
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", document.id);

      if (error) {
        console.error("Error deleting document:", error);
        toast.error("문서 삭제 실패");
        return;
      }

      toast.success("문서 삭제 완료");
      getData();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      contract: '계약서',
      registration: '등록증',
      insurance: '보험증서',
      inspection: '검사증',
      id: '신분증',
      invoice: '송장',
      other: '기타',
    };
    return labels[type] || type;
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
                문서 업로드
              </Button>
              <div className="flex gap-3 flex-wrap">
                <Select
                  placeholder="문서 유형"
                  className="w-40"
                  defaultSelectedKeys={["all"]}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <SelectItem key="all" value="all">
                    전체
                  </SelectItem>
                  <SelectItem key="contract" value="contract">
                    계약서
                  </SelectItem>
                  <SelectItem key="registration" value="registration">
                    등록증
                  </SelectItem>
                  <SelectItem key="insurance" value="insurance">
                    보험증서
                  </SelectItem>
                  <SelectItem key="inspection" value="inspection">
                    검사증
                  </SelectItem>
                  <SelectItem key="id" value="id">
                    신분증
                  </SelectItem>
                  <SelectItem key="invoice" value="invoice">
                    송장
                  </SelectItem>
                  <SelectItem key="other" value="other">
                    기타
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
                  placeholder="문서명 또는 설명 검색..."
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <Table aria-label="Documents table" className="min-w-[1200px]">
                <TableHeader>
                  <TableColumn className="text-center whitespace-nowrap">업로드일</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">문서유형</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">문서명</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">거래</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">차량</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">파일크기</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">업로드자</TableColumn>
                  <TableColumn className="text-center whitespace-nowrap">관리</TableColumn>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center whitespace-nowrap">
                        {new Date(item.upload_date).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Chip color="primary" variant="flat" size="sm">
                          {getDocumentTypeLabel(item.document_type)}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.document_name}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.transactions?.contract_number || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {getCarTitle(item.cardata)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {formatFileSize(item.file_size)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {item.profiles?.name || '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="flex gap-2 justify-center">
                          <Button
                            as="a"
                            href={item.file_url}
                            target="_blank"
                            size="sm"
                            variant="bordered"
                            color="primary"
                          >
                            다운로드
                          </Button>
                          <Button
                            onPress={() => {
                              onOpen();
                              setSelectData(item);
                            }}
                            size="sm"
                            variant="bordered"
                            color="secondary"
                          >
                            상세
                          </Button>
                          <Button
                            onPress={() => handleDeleteDocument(item)}
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

          {/* 문서 상세 모달 */}
          <Modal size={"2xl"} isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    문서 상세 정보
                  </ModalHeader>
                  <ModalBody className="grid grid-cols-2 gap-4">
                    <div>
                      <h1 className="mb-2 font-semibold">문서 유형</h1>
                      <Input
                        value={getDocumentTypeLabel(selectData?.document_type)}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">문서명</h1>
                      <Input
                        value={selectData?.document_name || ""}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">파일명</h1>
                      <Input
                        value={selectData?.file_name || ""}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">파일 크기</h1>
                      <Input
                        value={formatFileSize(selectData?.file_size)}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">업로드일</h1>
                      <Input
                        value={new Date(selectData?.upload_date).toLocaleString('ko-KR')}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">업로드자</h1>
                      <Input
                        value={selectData?.profiles?.name || "-"}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <h1 className="mb-2 font-semibold">설명</h1>
                      <Textarea
                        value={selectData?.description || ""}
                        disabled
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        as="a"
                        href={selectData?.file_url}
                        target="_blank"
                        className="w-full bg-blue-500 text-white"
                      >
                        파일 다운로드
                      </Button>
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

          {/* 문서 업로드 모달 */}
          <Modal size={"2xl"} isOpen={isAddOpen} onOpenChange={onAddOpenChange} scrollBehavior="inside">
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>문서 업로드</ModalHeader>
                  <ModalBody className="grid grid-cols-1 gap-4">
                    <div>
                      <h1 className="mb-2 font-semibold">파일 선택 *</h1>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="w-full p-2 border rounded"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        지원 형식: PDF, DOC, DOCX, JPG, PNG
                      </p>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">문서 유형 *</h1>
                      <Select
                        onChange={(e) =>
                          setNewDocument({ ...newDocument, document_type: e.target.value })
                        }
                        selectedKeys={[newDocument.document_type]}
                        className="w-full"
                      >
                        <SelectItem key="contract" value="contract">
                          계약서
                        </SelectItem>
                        <SelectItem key="registration" value="registration">
                          등록증
                        </SelectItem>
                        <SelectItem key="insurance" value="insurance">
                          보험증서
                        </SelectItem>
                        <SelectItem key="inspection" value="inspection">
                          검사증
                        </SelectItem>
                        <SelectItem key="id" value="id">
                          신분증
                        </SelectItem>
                        <SelectItem key="invoice" value="invoice">
                          송장
                        </SelectItem>
                        <SelectItem key="other" value="other">
                          기타
                        </SelectItem>
                      </Select>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">문서명</h1>
                      <Input
                        onChange={(e) =>
                          setNewDocument({ ...newDocument, document_name: e.target.value })
                        }
                        value={newDocument.document_name}
                        className="w-full"
                        type="text"
                        placeholder="문서 제목"
                      />
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">관련 거래</h1>
                      <Select
                        onChange={(e) =>
                          setNewDocument({ ...newDocument, transaction_id: e.target.value })
                        }
                        placeholder="거래 선택 (선택사항)"
                        className="w-full"
                      >
                        {transactions.map((transaction) => (
                          <SelectItem key={transaction.id} value={transaction.id}>
                            {transaction.contract_number || transaction.id.substring(0, 8)} ({transaction.transaction_type === 'purchase' ? '매입' : '매출'})
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">관련 차량</h1>
                      <Select
                        onChange={(e) =>
                          setNewDocument({ ...newDocument, car_id: e.target.value })
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
                      <h1 className="mb-2 font-semibold">관련 소유주</h1>
                      <Select
                        onChange={(e) =>
                          setNewDocument({ ...newDocument, owner_id: e.target.value })
                        }
                        placeholder="소유주 선택 (선택사항)"
                        className="w-full"
                      >
                        {owners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.name}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <h1 className="mb-2 font-semibold">설명</h1>
                      <Textarea
                        onChange={(e) =>
                          setNewDocument({ ...newDocument, description: e.target.value })
                        }
                        value={newDocument.description}
                        className="w-full"
                        placeholder="문서 설명..."
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
                      className="text-white"
                      color="primary"
                      onPress={handleUploadDocument}
                      disabled={uploading}
                    >
                      {uploading ? <Spinner size="sm" color="white" /> : "업로드"}
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

export default Documents;

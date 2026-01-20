import React from "react";
import { createClient } from "@/utils/supabase/server";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TabContent from "./components/TabContent";
import { cookies } from "next/headers";
import LanguageSelect from "@/app/(auth-pages)/components/LanguageSelect";
import { dictionary } from "@/app/(main-pages)/components/dictionary";
export default async function Page() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const languageCookie = cookies().get('language');
  const language = languageCookie ? languageCookie.value : 'kr';
  
  return (
    <div className="mt-10">
      <div className="page-heading flex flex-col justify-start items-start">
        {/* <h1 className="page-title test"> My Page </h1> */}
        <div className="flex flex-row justify-start items-start w-full">
          <LanguageSelect />
        </div>
        <nav className="nav__underline w-full">
          <ul className="group" uk-switcher="connect: #group-tabs; animation: uk-animation-slide-right-medium, uk-animation-slide-left-medium">
            <li><a href="#"> 권한</a></li>
            <li><a href="#"> 직원관리</a></li>
            <li><a href="#"> 매입/매출</a></li>
            <li><a href="#"> 수익분석</a></li>
            <li><a href="#"> 소유주</a></li>
            <li><a href="#"> 문서관리</a></li>
            <li><a href="#"> 고객할당</a></li>
            <li><a href="#"> 결제요청</a></li>
            <li><a href="#"> 결제승인</a></li>
            <li><a href="#"> 입출금</a></li>
            <li><a href="#"> 답변</a></li>
            <li><a href="#"> 상품목록</a></li>
            <li><a href="#"> 채팅</a></li>
          </ul>
        </nav>
      </div>
      <TabContent session={session} language={language} dictionary={dictionary}/>
    </div>
  );
}
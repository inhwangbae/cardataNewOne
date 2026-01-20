"use client";

import React, { useState,useEffect } from "react";
import Answer from "./Answer";
import Role from "./Role";
import Products from "./Products";
import StreamChat from "./StreamChat";
import Staff from "./Staff";
import Transactions from "./Transactions";
import Profit from "./Profit";
import Owners from "./Owners";
import Documents from "./Documents";
import CustomerAssignments from "./CustomerAssignments";

export default function TabContent({ session, language,dictionary }) {
  const [activeTab, setActiveTab] = useState("role");
  const [defaultLanguage, setDefaultLanguage] = useState("ko");

  useEffect(() => {
    if (language === "kr") {
      setDefaultLanguage("ko");
    } else if (language === "en" || language === "ru") {
      setDefaultLanguage(language);
    }
  }, [language]);
  const userData = {
    language: defaultLanguage,
    id: 'connectcar_ceo', // '@' 기준으로 분할하여 첫 번째 부분만 사용
    name: "master",
    image:
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
  };
  return (
    <div>
      <ul className="uk-switcher" id="group-tabs">
        <li className={activeTab === "role" ? "uk-active" : ""}>
          <Role session={session} language={language} />
        </li>
        <li className={activeTab === "staff" ? "uk-active" : ""}>
          <Staff session={session} language={language} />
        </li>
        <li className={activeTab === "transactions" ? "uk-active" : ""}>
          <Transactions session={session} language={language} />
        </li>
        <li className={activeTab === "profit" ? "uk-active" : ""}>
          <Profit session={session} language={language} />
        </li>
        <li className={activeTab === "owners" ? "uk-active" : ""}>
          <Owners session={session} language={language} />
        </li>
        <li className={activeTab === "documents" ? "uk-active" : ""}>
          <Documents session={session} language={language} />
        </li>
        <li className={activeTab === "assignments" ? "uk-active" : ""}>
          <CustomerAssignments session={session} language={language} />
        </li>
        <li className={activeTab === "answer" ? "uk-active" : ""}>
          <Answer session={session} language={language} />
        </li>
        <li className={activeTab === "products" ? "uk-active" : ""}>
          <Products session={session} language={language} />
        </li>
        <li className={activeTab === "chat" ? "uk-active" : ""}>
          <StreamChat
            defaultLanguage={defaultLanguage}
            dictionary={dictionary}
            userData={userData}
            language={language}
            session={session}
          />{" "}
        </li>
      </ul>
    </div>
  );
}

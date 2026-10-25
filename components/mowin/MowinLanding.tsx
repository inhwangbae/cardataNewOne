"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import MowinOrb from "./MowinOrb";
import { FALLBACK, FAQS, Faq, FaqGroup, GREETING, GROUPS, findFaq } from "./faq";

// space: 우주 속 희미한 구체 → waking: 밝아지며 백색 화면으로 → ready: AI 모윈 안내 시작
type Phase = "space" | "waking" | "ready";

type Message = { from: "mowin" | "user"; text: string; link?: Faq["link"] };

const AUTO_WAKE_MS = 7000;

export default function MowinLanding() {
  const [phase, setPhase] = useState<Phase>("space");
  const [whiteOut, setWhiteOut] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [reply, setReply] = useState<Message>({ from: "mowin", text: "" });
  const [typed, setTyped] = useState("");
  const [input, setInput] = useState("");
  const [group, setGroup] = useState<FaqGroup>("moduwinner");

  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const typeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const recogRef = useRef<any>(null);

  // 한국어 음성 고르기
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current =
        voices.find((v) => v.lang === "ko-KR" && /google|yuna|sunhi|heami/i.test(v.name)) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith("ko")) ||
        null;
    };
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    setCanListen(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", pick);
      window.speechSynthesis.cancel();
      if (typeTimer.current) clearInterval(typeTimer.current);
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!soundRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    // 문장 단위로 나눠 읽기 (긴 발화가 끊기는 브라우저 대응)
    const sentences = text.match(/[^.!?。]+[.!?。]?/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
    sentences.forEach((s, i) => {
      const u = new SpeechSynthesisUtterance(s);
      u.lang = "ko-KR";
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 1.02;
      u.pitch = 1.1;
      if (i === 0) u.onstart = () => setSpeaking(true);
      if (i === sentences.length - 1) {
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
      }
      synth.speak(u);
    });
  }, []);

  const say = useCallback(
    (msg: Message) => {
      setReply(msg);
      setTyped("");
      if (typeTimer.current) clearInterval(typeTimer.current);
      let i = 0;
      typeTimer.current = setInterval(() => {
        i += 1;
        setTyped(msg.text.slice(0, i));
        if (i >= msg.text.length && typeTimer.current) clearInterval(typeTimer.current);
      }, 38);
      speak(msg.text);
    },
    [speak],
  );

  const wake = useCallback(
    (withSound: boolean) => {
      if (phase !== "space") return;
      setSoundOn(withSound);
      soundRef.current = withSound;
      // 사용자 터치 직후 빈 발화로 음성 출력 잠금 해제 (모바일 사파리 등)
      if (withSound && "speechSynthesis" in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setPhase("waking");
      setTimeout(() => setWhiteOut(true), reduced ? 0 : 1600);
      setTimeout(
        () => {
          setPhase("ready");
          say({ from: "mowin", text: GREETING });
        },
        reduced ? 300 : 3600,
      );
    },
    [phase, say],
  );

  // 아무 조작이 없으면 소리 없이 자동으로 깨어남
  useEffect(() => {
    if (phase !== "space") return;
    const id = setTimeout(() => wake(false), AUTO_WAKE_MS);
    return () => clearTimeout(id);
  }, [phase, wake]);

  const answer = (faq: Faq | null, asked: string) => {
    setQuestion(asked);
    if (faq) setGroup(faq.group);
    say(faq ? { from: "mowin", text: faq.answer, link: faq.link } : { from: "mowin", text: FALLBACK });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setInput("");
    answer(findFaq(q), q);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundRef.current = next;
    if (!next) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
    } else if (reply.text) {
      speak(reply.text);
    }
  };

  const toggleListen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    const r = new SR();
    r.lang = "ko-KR";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (ev: any) => {
      const heard: string = ev.results[0][0].transcript;
      answer(findFaq(heard), heard);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    r.start();
  };

  const ready = phase === "ready";

  return (
    <main
      className="relative h-[100dvh] w-full overflow-hidden bg-[#03030a] text-slate-900 select-none"
      onClick={() => phase === "space" && wake(true)}
    >
      {/* 우주 배경 */}
      <div className={`absolute inset-0 mowin-stars transition-opacity [transition-duration:2500ms] ${phase === "space" ? "opacity-100" : "opacity-40"}`} />

      {/* 백색으로 번지는 빛 */}
      <div
        className="absolute inset-0 bg-[#fbfbff] transition-[clip-path] [transition-duration:2000ms] [transition-timing-function:cubic-bezier(.6,0,.2,1)]"
        style={{ clipPath: whiteOut ? "circle(150% at 50% 42%)" : "circle(0% at 50% 42%)" }}
      />

      {/* 상단 바 */}
      <header
        className={`absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 md:px-10 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <span className="text-xs font-semibold tracking-[0.3em] text-slate-800 md:text-sm">MODUWINNER</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className="whitespace-nowrap rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs text-slate-600 backdrop-blur hover:bg-white"
            aria-pressed={soundOn}
          >
            {soundOn ? "🔊" : "🔇"}
            <span className="ml-1 hidden md:inline">{soundOn ? "음성 켜짐" : "음성 꺼짐"}</span>
          </button>
          <Link
            href="/sign-in"
            className="whitespace-nowrap rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          >
            서비스 시작하기
          </Link>
        </div>
      </header>

      {/* AI 모윈 구체 */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 transition-all [transition-duration:1800ms] [transition-timing-function:cubic-bezier(.6,0,.2,1)] ${
          ready ? "top-[6%] h-[34dvh] w-[34dvh] max-w-[90vw] md:h-[36dvh] md:w-[36dvh]" : "top-1/2 h-[70vmin] w-[70vmin] -translate-y-1/2"
        }`}
      >
        <MowinOrb
          className="h-full w-full"
          brightness={phase === "space" ? 0.15 : 1}
          speaking={speaking}
          listening={listening}
          onLight={whiteOut}
        />
      </div>

      {/* 첫 안내 문구 (우주) */}
      <p
        className={`absolute inset-x-0 bottom-[12%] text-center text-sm tracking-widest text-indigo-100/70 transition-opacity duration-1000 ${
          phase === "space" ? "opacity-100 animate-pulse" : "opacity-0"
        }`}
      >
        화면을 터치하여 모윈을 깨워주세요
      </p>

      {/* 대화 영역 */}
      <section
        className={`absolute inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pb-5 md:gap-4 md:pb-6 transition-all duration-1000 ${
          ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 pointer-events-none"
        }`}
        aria-live="polite"
      >
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">AI 모윈</h1>
          <p className="mt-1 text-xs text-slate-500">유익한 정보 · 유익한 서비스 · 모두의 이익</p>
        </div>

        <div className="max-h-[24dvh] min-h-[96px] shrink-0 md:max-h-[30dvh] overflow-y-auto rounded-2xl border border-indigo-100 bg-white/80 p-4 shadow-[0_8px_30px_rgba(79,70,229,0.08)] backdrop-blur">
          {question && <p className="mb-2 text-right text-sm text-slate-500">“{question}”</p>}
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-800">
            {typed}
            {typed.length < reply.text.length && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-indigo-500" />}
          </p>
          {reply.link && typed.length >= reply.text.length && (
            <Link
              href={reply.link.href}
              className="mt-3 inline-block rounded-full bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-500"
            >
              {reply.link.label} →
            </Link>
          )}
        </div>

        <div className="flex justify-center gap-1 rounded-full bg-slate-100 p-1 self-center" role="tablist">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={group === g.id}
              onClick={() => setGroup(g.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1 text-xs transition md:text-sm ${
                group === g.id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0 md:pb-0">
          {FAQS.filter((f) => f.group === group).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => answer(f, f.question)}
              className="shrink-0 whitespace-nowrap rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50 md:text-sm"
            >
              {f.question}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1.5 pl-4 shadow-sm">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="모윈에게 물어보세요"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            aria-label="모윈에게 질문하기"
          />
          {canListen && (
            <button
              type="button"
              onClick={toggleListen}
              className={`rounded-full px-3 py-2 text-sm ${listening ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              aria-label={listening ? "음성 입력 중지" : "음성으로 질문하기"}
            >
              {listening ? "듣는 중…" : "🎙"}
            </button>
          )}
          <button type="submit" className="whitespace-nowrap rounded-full !bg-indigo-600 px-4 py-2 text-sm text-white hover:!bg-indigo-500">
            질문
          </button>
        </form>
      </section>
    </main>
  );
}

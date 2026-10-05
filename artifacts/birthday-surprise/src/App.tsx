import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";

const queryClient = new QueryClient();

const birthdayPhotos = [
  {
    src: `${import.meta.env.BASE_URL}images/aom-01.webp`,
    alt: "ภาพประกอบพี่อ้อมในคาเฟ่",
  },
  {
    src: `${import.meta.env.BASE_URL}images/aom-02.webp`,
    alt: "ภาพประกอบพี่อ้อมกับวิวภูเขา",
  },
  {
    src: `${import.meta.env.BASE_URL}images/aom-03.webp`,
    alt: "ภาพประกอบพี่อ้อมเดินเล่นในสวน",
  },
];

const GIFT_UNLOCK_AT = Date.parse("2026-10-12T00:01:00+07:00");

const couponPerks = [
  { icon: "🍕", title: "คูปองกินบุฟเฟ่ต์หรือพิซซ่าด้วยกัน(ฟรี)" },
  { icon: "🍸", title: "คูปองไปดื่มเบียร์ด้วยกัน" },
  { icon: "🧳", title: "คูปองไปออกทริปด้วยกัน" },
];

type YouTubePlayer = {
  setVolume: (volume: number) => void;
  playVideo: () => void;
  unMute: () => void;
  mute: () => void;
  getPlayerState: () => number;
  destroy: () => void;
};

type YouTubePlayerEvent = {
  target: YouTubePlayer;
  data?: number;
};

type YouTubeApi = {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onReady: (event: YouTubePlayerEvent) => void;
        onStateChange: (event: YouTubePlayerEvent) => void;
        onAutoplayBlocked: (event: YouTubePlayerEvent) => void;
      };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function playSoftCelebrationSound() {
  if (typeof window === "undefined") return;

  if (
    typeof SpeechSynthesisUtterance !== "undefined" &&
    "speechSynthesis" in window
  ) {
    const cheer = new SpeechSynthesisUtterance("เย้! เย้!");
    cheer.lang = "th-TH";
    cheer.rate = 1.1;
    cheer.pitch = 1.3;
    cheer.volume = 0.76;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(cheer);
  }

  const AudioContextConstructor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextConstructor) return;

  const context = new AudioContextConstructor();
  void context.resume().catch(() => undefined);
  const applause = context.createGain();
  applause.gain.setValueAtTime(0.4, context.currentTime);
  applause.connect(context.destination);

  const roomEcho = context.createDelay();
  const echoLevel = context.createGain();
  roomEcho.delayTime.value = 0.09;
  echoLevel.gain.value = 0.18;
  roomEcho.connect(echoLevel);
  echoLevel.connect(applause);

  const clapOffsets = [0, 0.3, 0.62, 0.95, 1.29, 1.63, 1.98, 2.33, 2.67, 3.02];
  const stereoPositions = [
    -0.45, 0.34, -0.2, 0.5, -0.52, 0.18, 0.42, -0.3, -0.1, 0.28,
  ];
  const firstClap = context.currentTime + 0.92;
  clapOffsets.forEach((offset, index) => {
    const clapBuffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * 0.22),
      context.sampleRate,
    );
    const noise = clapBuffer.getChannelData(0);
    for (let sample = 0; sample < noise.length; sample += 1) {
      const decay = Math.exp(-sample / (noise.length * 0.24));
      noise[sample] = (Math.random() * 2 - 1) * decay;
    }

    const clap = context.createBufferSource();
    const brightFilter = context.createBiquadFilter();
    const bodyFilter = context.createBiquadFilter();
    const brightEnvelope = context.createGain();
    const bodyEnvelope = context.createGain();
    const pan = context.createStereoPanner();
    const startAt = firstClap + offset + (Math.random() - 0.5) * 0.04;

    clap.buffer = clapBuffer;
    brightFilter.type = "bandpass";
    brightFilter.frequency.value = 1250 + Math.random() * 850;
    brightFilter.Q.value = 0.48;
    bodyFilter.type = "lowpass";
    bodyFilter.frequency.value = 820 + (index % 3) * 110;
    pan.pan.value = stereoPositions[index];
    brightEnvelope.gain.setValueAtTime(0.0001, startAt);
    brightEnvelope.gain.exponentialRampToValueAtTime(0.88, startAt + 0.008);
    brightEnvelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.15);
    bodyEnvelope.gain.setValueAtTime(0.0001, startAt);
    bodyEnvelope.gain.exponentialRampToValueAtTime(0.48, startAt + 0.012);
    bodyEnvelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.2);

    clap.connect(brightFilter);
    brightFilter.connect(brightEnvelope);
    clap.connect(bodyFilter);
    bodyFilter.connect(bodyEnvelope);
    brightEnvelope.connect(pan);
    bodyEnvelope.connect(pan);
    pan.connect(applause);
    pan.connect(roomEcho);
    clap.start(startAt);
    clap.stop(startAt + 0.22);
  });

  window.setTimeout(() => void context.close(), 4900);
}

function Home() {
  const [hasOpenedIntro, setHasOpenedIntro] = useState(false);
  const [step, setStep] = useState(1);
  const [giftIsUnlocked, setGiftIsUnlocked] = useState(
    () => Date.now() >= GIFT_UNLOCK_AT,
  );
  const [celebration, setCelebration] = useState(0);
  const [celebrationKind, setCelebrationKind] = useState<"gift" | "coupon">(
    "gift",
  );
  const musicFrameRef = useRef<HTMLIFrameElement>(null);
  const musicPlayerRef = useRef<YouTubePlayer | undefined>(undefined);
  const musicStartRequestedRef = useRef(false);
  const musicVideoId = "bqd_FzHN1xA";

  useEffect(() => {
    if (!celebration) return;
    const timeout = window.setTimeout(() => setCelebration(0), 2500);
    return () => window.clearTimeout(timeout);
  }, [celebration]);

  useEffect(() => {
    if (giftIsUnlocked) return;

    let timeoutId: number | undefined;
    const checkUnlockTime = () => {
      const remaining = GIFT_UNLOCK_AT - Date.now();
      if (remaining <= 0) {
        setGiftIsUnlocked(true);
        return;
      }
      timeoutId = window.setTimeout(checkUnlockTime, remaining);
    };

    checkUnlockTime();
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [giftIsUnlocked]);

  useEffect(() => {
    const iframe = musicFrameRef.current;
    if (!iframe) return;

    let active = true;
    let player: YouTubePlayer | undefined;
    const initializePlayer = () => {
      if (!active || !window.YT?.Player) return;
      player = new window.YT.Player(iframe, {
        events: {
          onReady: ({ target }) => {
            if (!active) return;
            musicPlayerRef.current = target;
            target.setVolume(50);
            if (musicStartRequestedRef.current) {
              target.unMute();
              target.playVideo();
            }
          },
          onStateChange: ({ data }) => {
            if (!active) return;
            if (data === 0 || data === 2)
              musicStartRequestedRef.current = false;
          },
          onAutoplayBlocked: () => {
            if (!active) return;
            musicStartRequestedRef.current = false;
          },
        },
      });
    };

    const previousReadyCallback = window.onYouTubeIframeAPIReady;
    const handleApiReady = () => {
      previousReadyCallback?.();
      initializePlayer();
    };

    if (window.YT?.Player) {
      initializePlayer();
    } else {
      window.onYouTubeIframeAPIReady = handleApiReady;
      let apiScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]',
      );
      if (!apiScript) {
        apiScript = document.createElement("script");
        apiScript.src = "https://www.youtube.com/iframe_api";
        apiScript.async = true;
        document.head.appendChild(apiScript);
      }
    }

    return () => {
      active = false;
      if (window.onYouTubeIframeAPIReady === handleApiReady) {
        window.onYouTubeIframeAPIReady = previousReadyCallback;
      }
      musicPlayerRef.current = undefined;
      player?.destroy();
    };
  }, []);

  const startMusicFromGesture = () => {
    musicStartRequestedRef.current = true;
    const player = musicPlayerRef.current;
    if (player) {
      player.unMute();
      player.setVolume(50);
      player.playVideo();
    }
  };

  const openIntroGift = () => {
    startMusicFromGesture();
    setHasOpenedIntro(true);
  };

  const advance = (nextStep: number) => {
    setStep(nextStep);
    setCelebrationKind(nextStep === 2 ? "gift" : "coupon");
    setCelebration((count) => count + 1);
    playSoftCelebrationSound();
  };

  const restart = () => {
    setStep(1);
    setCelebration(0);
  };

  const confetti = Array.from({ length: 48 }, (_, index) => {
    const palette = ["#e76b78", "#f2b544", "#4b9b88", "#f28f68", "#a876a0"];
    const type = index % 5 === 0 ? "circle" : index % 3 === 0 ? "ribbon" : "";
    return (
      <span
        aria-hidden="true"
        className={`confetti-piece ${type}`}
        key={`${celebration}-${index}`}
        style={
          {
            "--x": `${(index * 37 + 7) % 100}%`,
            "--size": `${6 + (index % 4) * 2}px`,
            "--color": palette[index % palette.length],
            "--duration": `${1.7 + (index % 7) * 0.15}s`,
            "--delay": `${(index % 8) * 0.035}s`,
            "--rotation": `${index * 19}deg`,
            "--spin": `${index % 2 ? 520 : -520}deg`,
            "--drift": `${(index % 2 ? 1 : -1) * (25 + (index % 6) * 13)}px`,
          } as CSSProperties
        }
      />
    );
  });
  const floatingIcons =
    step === 1
      ? ["✦", "♡", "✳"]
      : step === 2
        ? ["💗", "🎂", "🎆"]
        : ["😁", "✨", "🎟️"];

  return (
    <>
      <iframe
        allow="autoplay; encrypted-media; picture-in-picture"
        className="background-music-player"
        ref={musicFrameRef}
        src={`https://www.youtube-nocookie.com/embed/${musicVideoId}?autoplay=0&loop=1&playlist=${musicVideoId}&controls=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
        tabIndex={-1}
        title="เพลงประกอบวันเกิด"
      />
      {!hasOpenedIntro ? (
        <main
          className="birthday-page birthday-intro-page"
          data-testid="birthday-intro"
        >
          <span aria-hidden="true" className="ambient-doodle doodle-one">
            ✳
          </span>
          <span aria-hidden="true" className="ambient-doodle doodle-two">
            ♡
          </span>
          <span aria-hidden="true" className="ambient-doodle doodle-three">
            ✦
          </span>
          <span aria-hidden="true" className="ambient-doodle doodle-four">
            ✳
          </span>
          <button
            aria-label="เปิดกล่องของขวัญเพื่อเข้าสู่หน้าอวยพร"
            className="intro-gift-button"
            data-testid="button-enter-birthday"
            onClick={openIntroGift}
            type="button"
          >
            <span aria-hidden="true" className="intro-gift-halo" />
            <span aria-hidden="true" className="intro-gift-box">
              🎁
            </span>
            <span
              aria-hidden="true"
              className="intro-gift-spark intro-spark-one"
            >
              ✦
            </span>
            <span
              aria-hidden="true"
              className="intro-gift-spark intro-spark-two"
            >
              ✧
            </span>
            <span
              aria-hidden="true"
              className="intro-gift-spark intro-spark-three"
            >
              ✳
            </span>
          </button>
        </main>
      ) : (
        <main className="birthday-page" data-testid="birthday-experience">
          <span aria-hidden="true" className="ambient-doodle doodle-one">
            ✳
          </span>
          <span aria-hidden="true" className="ambient-doodle doodle-two">
            ♡
          </span>
          <span aria-hidden="true" className="ambient-doodle doodle-three">
            ✦
          </span>
          <span aria-hidden="true" className="ambient-doodle doodle-four">
            ✳
          </span>
          <div
            aria-hidden="true"
            className="floating-decorations"
            data-testid="floating-decorations"
            key={`floating-decorations-${step}`}
          >
            {floatingIcons.map((icon, index) => (
              <span
                className={`floating-decoration floating-decoration-${index + 1}`}
                key={icon}
              >
                {icon}
              </span>
            ))}
          </div>
          {celebration > 0 && (
            <div
              aria-hidden="true"
              className="confetti-layer"
              key={celebration}
            >
              {confetti}
              <div className={`celebration-splash ${celebrationKind}`}>
                <span className="celebration-ring" />
                {Array.from({ length: 8 }, (_, index) => (
                  <span
                    className="celebration-spark"
                    key={index}
                    style={{ "--angle": `${index * 45}deg` } as CSSProperties}
                  >
                    ✦
                  </span>
                ))}
                <span className="celebration-icon">
                  {celebrationKind === "gift" ? "🎁" : "🎟️"}
                </span>
              </div>
            </div>
          )}
          <section className="birthday-shell" aria-label="ของขวัญวันเกิด">
            <div
              className="step-mark"
              aria-label={`ขั้นตอนที่ ${step} จาก 3`}
              data-testid="text-step-status"
            >
              <span>STEP {step} / 3</span>
              <span className="step-dots" aria-hidden="true">
                {[1, 2, 3].map((number) => (
                  <span
                    className={`step-dot ${step === number ? "active" : ""}`}
                    key={number}
                  />
                ))}
              </span>
            </div>
            <div className="page-content" key={step} aria-live="polite">
              {step === 1 && (
                <>
                  <div className="gift-scene" aria-hidden="true">
                    <span className="gift-halo" />
                    <span className="burst-spark spark-a">✦</span>
                    <span className="burst-spark spark-b">✧</span>
                    <span className="burst-spark spark-c">✳</span>
                    <span className="gift-emoji">🎁</span>
                  </div>
                  <h1
                    className="birthday-title script"
                    data-testid="text-gift-title"
                  >
                    ✨ มีข้อความและของขวัญส่งถึงคุณ ✨
                  </h1>
                  <br/>
                  <button
                    className="primary-action gift-open-action"
                    data-testid="button-open-gift"
                    aria-describedby={
                      giftIsUnlocked ? undefined : "gift-unlock-note"
                    }
                    disabled={!giftIsUnlocked}
                    onClick={() => advance(2)}
                    type="button"
                  >
                    <span aria-hidden="true">
                      {giftIsUnlocked ? "🎁" : "🔒"}
                    </span>
                    <span>
                      {giftIsUnlocked ? "กดเพื่อเปิด" : "ยังเปิดไม่ได้"}
                    </span>
                  </button>
                  <br/><br/>
                  <p
                    aria-live="polite"
                    className={`tiny-note ${giftIsUnlocked ? "" : "gift-lock-note"}`}
                    id={giftIsUnlocked ? undefined : "gift-unlock-note"}
                  >
                    {giftIsUnlocked ? (
                      "เปิดเพื่อดูข้อความและของขวัญส่งถึงคุณ"
                    ) : (
                      <>
                        <span aria-hidden="true">🔒 </span>
                        เปิดได้หลังวันที่{" "}
                        <time dateTime="2026-10-12T00:01:00+07:00">
                          12 ตุลาคม 2569
                        </time>
                      </>
                    )}
                  </p>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="message-badge" aria-hidden="true">
                    🎂
                  </div>
                  <p
                    className="birthday-recipient"
                    data-testid="text-birthday-recipient"
                  >
                    ถึง พี่อ้อม
                  </p>
                  <h1
                    className="message-title birthday-message-title"
                    data-testid="text-birthday-message"
                  >
                    Happy Birthday to Aomaoey ในวัย 28 ขวบ
                  </h1>
                  <div
                    className="message-body birthday-message-body"
                    data-testid="text-birthday-wishes"
                  >
                    <p>
                      ขอให้ปีนี้เป็นปีที่ดีมาก ๆ มีความสุขในทุก ๆ วัน
                      สุขภาพแข็งแรง มีเรื่องดี ๆ
                    </p>
                    <p>
                      ขอให้ได้ทำในสิ่งที่ชอบและตั้งใจไว้
                      คิดหวังสิ่งใดก็ขอให้สมปรารถนา และที่สำคัญ{" "}
                      <strong>
                        ขอให้ปีนี้ เฮง ๆ ถูกหวยฉ่ำ ๆ เงินมาแบบไม่ทันตั้งตัว
                      </strong>
                    </p>
                    <p>
                      สุดท้ายนี้ขอให้เป็นพี่อ้อมที่ยิ้มเยอะ ๆ
                      และมีความสุขแบบนี้ไปนาน ๆ
                    </p>
                    <p className="birthday-signoff">
                      สุขสันต์วันเกิดอีกครั้งครับ
                    </p>
                  </div>
                  <aside
                    className="birthday-followup-note"
                    aria-label="ข้อความเพิ่มเติม"
                  >
                    <p>
                      ปล.1 กระเป๋านี้พี่เคยบอกว่าอยากได้ไม่รู้ว่าซื้อมารึยัง
                    </p>
                    <p>ปล.2 กระเป๋าเล็กสีเทาเขียวหมด</p>
                    <p className="birthday-followup-signoff">
                      ยังไม่หมดเท่านั้นครับ มีของขวัญเล็ก ๆ น้อย ๆ ให้ครับ
                    </p>
                  </aside>
                  <button
                    className="primary-action"
                    data-testid="button-reveal-coupon"
                    onClick={() => advance(3)}
                    type="button"
                  >
                    <span>คลิกรับของขวัญพิเศษ 🎟️</span>
                  </button>
                </>
              )}
              {step === 3 && (
                <>
                  <h1
                    className="message-title coupon-page-title"
                    data-testid="text-coupon-heading"
                  >
                    คูปองวันเกิด
                  </h1>
                  <div
                    className="coupon-list"
                    data-testid="content-birthday-coupons"
                  >
                    {couponPerks.map((coupon, index) => (
                      <div
                        className="coupon-card"
                        key={coupon.title}
                        data-testid={`content-birthday-coupon-${index + 1}`}
                      >
                        <div className="coupon-header">
                          <div className="coupon-icon" aria-hidden="true">
                            {coupon.icon}
                          </div>
                          <div className="coupon-heading">
                            <p className="coupon-kicker">
                              คูปอง {index + 1} จาก {couponPerks.length}
                            </p>
                            <h2 className="coupon-title">{coupon.title}</h2>
                          </div>
                        </div>
                        <div
                          className="coupon-perforation"
                          aria-hidden="true"
                        />
                        <p className="coupon-caption">
                          เงื่อนไข: ใช้คูปองได้ก็ต่อเมื่อทักไลน์มาแล้วดีล
                          (ไม่มีหมดอายุ)
                        </p>
                      </div>
                    ))}
                  </div>
                  <button
                    className="restart-action"
                    data-testid="button-restart"
                    onClick={restart}
                    type="button"
                  >
                    <span>เปิดกล่องใหม่อีกครั้ง 🔁</span>
                  </button>
                </>
              )}
            </div>
          </section>
          {step === 2 && (
            <div
              className="birthday-gallery"
              data-testid="birthday-photo-gallery"
              aria-label="รูปภาพประกอบวันเกิด"
            >
              {birthdayPhotos.map((photo, index) => (
                <figure
                  className={`birthday-photo-frame birthday-photo-frame-${index + 1}`}
                  key={photo.src}
                >
                  <img
                    alt={photo.alt}
                    className="birthday-photo"
                    decoding="async"
                    height={1024}
                    loading="lazy"
                    src={photo.src}
                    width={768}
                  />
                </figure>
              ))}
            </div>
          )}
        </main>
      )}
    </>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

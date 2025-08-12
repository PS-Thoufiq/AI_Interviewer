import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const InterviewSecurity = ({ onEndInterview }) => {
  const [isHidden, setIsHidden] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // ===== Common Countdown Trigger =====
  const startCountdown = (reason) => {
    setIsHidden(true);
    setCountdown(10);
    toast.warn(`${reason} detected! Return within 10 seconds or interview will end.`, {
      position: "top-left",
      autoClose: 3000,
      theme: "dark",
    });

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          toast.error("Interview terminated due to security violation.", {
            position: "top-left",
            autoClose: 2000,
            theme: "dark",
          });
          onEndInterview();
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    setIsHidden(false);
    clearInterval(timerRef.current);
    toast.success("Returned to interview. Timer stopped.", {
      position: "top-left",
      autoClose: 2000,
      theme: "dark",
    });
  };

  // ===== Force Fullscreen on Start =====
  useEffect(() => {
    const enterFullscreen = () => {
      const elem = document.documentElement;
      if (elem.requestFullscreen) elem.requestFullscreen();
      else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
      else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    };
    enterFullscreen();
  }, []);

  // ===== Disable Copy, Cut, Paste, Right Click =====
  useEffect(() => {
    const showToast = (action) => {
      toast.error(`${action} is disabled during the interview.`, {
        position: "top-left",
        autoClose: 2000,
        theme: "dark",
      });
    };

    const preventAction = (e, action) => {
      e.preventDefault();
      showToast(action);
    };

    document.addEventListener("copy", (e) => preventAction(e, "Copying"));
    document.addEventListener("cut", (e) => preventAction(e, "Cutting"));
    document.addEventListener("paste", (e) => preventAction(e, "Pasting"));
    document.addEventListener("contextmenu", (e) => preventAction(e, "Right-click"));

    return () => {
      document.removeEventListener("copy", preventAction);
      document.removeEventListener("cut", preventAction);
      document.removeEventListener("paste", preventAction);
      document.removeEventListener("contextmenu", preventAction);
    };
  }, []);

  // ===== Tab Switch Detection =====
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        startCountdown("Tab switch");
      } else {
        stopCountdown();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // ===== Blur Detection =====
  useEffect(() => {
    const handleBlur = () => {
      startCountdown("Window focus lost");
    };
    const handleFocus = () => {
      stopCountdown();
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // ===== Fullscreen Enforcement =====
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        startCountdown("Fullscreen exit");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // ===== DevTools Detection =====
  useEffect(() => {
    let devtoolsOpen = false;
    const threshold = 160;
    const checkDevTools = () => {
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          startCountdown("Developer Tools opened");
        }
      } else {
        devtoolsOpen = false;
      }
    };
    const interval = setInterval(checkDevTools, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {isHidden && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1001,
            color: "#fff",
            fontSize: "24px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p>Security violation detected. Redirecting in {countdown} seconds.</p>
            <p>Return to continue.</p>
          </div>
        </div>
      )}
    </>
  );
};

export default InterviewSecurity;

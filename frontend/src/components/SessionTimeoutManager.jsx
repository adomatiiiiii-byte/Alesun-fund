import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";
import { clearApplicantSession, isTokenExpired } from "../utils/authSession";

const INACTIVITY_LIMIT = 6 * 60 * 1000;
const WARNING_LEAD_TIME = 60 * 1000;
const WARNING_SECONDS = WARNING_LEAD_TIME / 1000;

export function SessionTimeoutManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token: internalToken, logout: logoutInternal } = useAuth();
  const applicantToken = localStorage.getItem("alesun_applicant_token");
  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_SECONDS);

  const activeSession = internalToken && !isTokenExpired(internalToken)
    ? { type: "internal", token: internalToken }
    : applicantToken && !isTokenExpired(applicantToken)
      ? { type: "applicant", token: applicantToken }
      : null;

  const clearTimers = useCallback(() => {
    window.clearTimeout(warningTimerRef.current);
    window.clearTimeout(logoutTimerRef.current);
    window.clearInterval(countdownTimerRef.current);
    warningTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownTimerRef.current = null;
  }, []);

  const completeLogout = useCallback(async (reason = "timeout") => {
    clearTimers();
    setWarningOpen(false);
    setCountdown(WARNING_SECONDS);

    if (activeSession?.type === "internal") {
      await logoutInternal(reason);
      navigate("/admin/login", { replace: true, state: { message: reason === "timeout" ? "Your session timed out due to inactivity." : "You have been logged out." } });
      return;
    }

    if (activeSession?.type === "applicant") {
      await api.applicantLogout(activeSession.token, { reason }).catch(() => {});
      clearApplicantSession();
      navigate("/login", { replace: true, state: { message: reason === "timeout" ? "Your session timed out due to inactivity." : "You have been logged out." } });
    }
  }, [activeSession, clearTimers, logoutInternal, navigate]);

  const resetTimers = useCallback(() => {
    if (!activeSession) {
      clearTimers();
      setWarningOpen(false);
      setCountdown(WARNING_SECONDS);
      return;
    }

    clearTimers();
    setWarningOpen(false);
    setCountdown(WARNING_SECONDS);

    warningTimerRef.current = window.setTimeout(() => {
      setWarningOpen(true);
      setCountdown(WARNING_SECONDS);
      countdownTimerRef.current = window.setInterval(() => {
        setCountdown((current) => Math.max(0, current - 1));
      }, 1000);
    }, INACTIVITY_LIMIT - WARNING_LEAD_TIME);

    logoutTimerRef.current = window.setTimeout(() => {
      completeLogout("timeout");
    }, INACTIVITY_LIMIT);
  }, [activeSession, clearTimers, completeLogout]);

  useEffect(() => {
    if (!activeSession) {
      clearTimers();
      setWarningOpen(false);
      setCountdown(WARNING_SECONDS);

      if (internalToken && isTokenExpired(internalToken)) {
        localStorage.removeItem("alesun_token");
        localStorage.removeItem("alesun_user");
      }
      if (applicantToken && isTokenExpired(applicantToken)) {
        clearApplicantSession();
      }
      return;
    }

    resetTimers();

    const activityEvents = ["mousemove", "keydown", "click", "scroll"];
    const handleActivity = () => resetTimers();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity, true));

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity, true));
      clearTimers();
    };
  }, [activeSession, applicantToken, clearTimers, internalToken, location.pathname, resetTimers]);

  if (!warningOpen || !activeSession) {
    return null;
  }

  return (
    <div className="imageOverlay">
      <div className="imageOverlayCard sessionTimeoutCard">
        <p className="eyebrow">Session timeout</p>
        <h2>You will be logged out due to inactivity in {countdown} seconds</h2>
        <p>Your session will end soon for security reasons.</p>
        <div className="buttonRow">
          <button type="button" onClick={resetTimers}>
            Stay Logged In
          </button>
          <button type="button" className="ghostButton" onClick={() => completeLogout("manual")}>
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import "./App.css";
import MapView from "./MapView";

export default function App() {
  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty(
        "--app-height",
        `${window.innerHeight}px`
      );
    };

    setAppHeight();
    window.addEventListener("resize", setAppHeight);
    window.addEventListener("orientationchange", setAppHeight);

    return () => {
      window.removeEventListener("resize", setAppHeight);
      window.removeEventListener("orientationchange", setAppHeight);
    };
  }, []);

  useEffect(() => {
    if (document.getElementById("matomo-tag-manager")) {
      return;
    }

    const _mtm = ((window as unknown as { _mtm?: unknown[] })._mtm =
      (window as unknown as { _mtm?: unknown[] })._mtm || []);
    _mtm.push({ "mtm.startTime": new Date().getTime(), event: "mtm.Start" });

    const d = document;
    const g = d.createElement("script");
    const s = d.getElementsByTagName("script")[0];

    g.async = true;
    g.id = "matomo-tag-manager";
    g.src =
      "https://cdn.matomo.cloud/road-learning.matomo.cloud/container_EF0mnvWM.js";

    if (s?.parentNode) {
      s.parentNode.insertBefore(g, s);
    } else {
      d.head?.appendChild(g);
    }
  }, []);

  return <MapView />;
}

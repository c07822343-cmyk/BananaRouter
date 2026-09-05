"use client";

import { useState } from "react";

interface BananaLogoProps {
  size?: number; // square size in px
  className?: string;
  alt?: string;
  /** if true, renders wordmark next to icon */
  withWordmark?: boolean;
  wordmarkClassName?: string;
}

/**
 * Loads /branding/banana-router-icon.svg first, then .png.
 * Falls back to a clean “B” placeholder — NOT a banana illustration.
 * Aspect ratio is preserved via object-contain.
 */
export function BananaLogo({ size = 32, className = "", alt = "BananaRouter", withWordmark = false, wordmarkClassName = "" }: BananaLogoProps) {
  const [failedSvg, setFailedSvg] = useState(false);
  const [failedPng, setFailedPng] = useState(false);

  const showSvg = !failedSvg;
  const showPng = failedSvg && !failedPng;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label={alt}>
      <span
        className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F6C446] text-[#1a1a1a] shadow-sm"
        style={{ width: size, height: size }}
        aria-hidden={showSvg || showPng ? undefined : true}
      >
        {showSvg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/branding/banana-router-icon.svg"
            alt={alt}
            width={size}
            height={size}
            className="h-full w-full object-contain p-1"
            onError={() => setFailedSvg(true)}
            loading="eager"
          />
        )}
        {showPng && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/branding/banana-router-icon.png"
            alt={alt}
            width={size}
            height={size}
            className="h-full w-full object-contain p-1"
            onError={() => setFailedPng(true)}
            loading="eager"
          />
        )}
        {!showSvg && !showPng && (
          <span className="text-[11px] font-bold tracking-tight" style={{ fontSize: Math.round(size * 0.42) }}>
            B
          </span>
        )}
      </span>
      {withWordmark && (
        <span className={`text-[15px] font-semibold tracking-tight ${wordmarkClassName}`}>BananaRouter</span>
      )}
    </span>
  );
}

export function BananaWordmark({ className = "" }: { className?: string }) {
  return <span className={`text-[15px] font-semibold tracking-tight ${className}`}>BananaRouter</span>;
}

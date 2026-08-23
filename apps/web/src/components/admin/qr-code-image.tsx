"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type QrCodeImageProps = {
  value: string;
  size?: number;
  className?: string;
};

export function QrCodeImage({
  value,
  size = 220,
  className,
}: QrCodeImageProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: {
        dark: "#1a2218",
        light: "#f4f1ea",
      },
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="Table QR code"
      width={size}
      height={size}
      className={className}
    />
  );
}

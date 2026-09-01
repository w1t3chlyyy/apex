import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: number;
  color?: string; // Color of the outer circle (default #000000)
  cutoutColor?: string; // Color of the inner cutouts (default #ffffff)
}

export default function BrandLogo({
  className = "w-6 h-6",
  size,
  color = "#000000",
  cutoutColor = "#ffffff",
}: BrandLogoProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      aria-label="Logo"
    >
      {/* Outer Main Circle */}
      <circle cx="50" cy="50" r="50" fill={color} />

      {/* 1. Large Top-Left Cutout */}
      <ellipse
        cx="33"
        cy="38"
        rx="23.5"
        ry="16"
        transform="rotate(-35 33 38)"
        fill={cutoutColor}
      />

      {/* 2. Small Top-Right Cutout */}
      <ellipse
        cx="74.5"
        cy="27.5"
        rx="7"
        ry="6.2"
        transform="rotate(-25 74.5 27.5)"
        fill={cutoutColor}
      />

      {/* 3. Medium Bottom-Right Cutout */}
      <ellipse
        cx="66.5"
        cy="65.5"
        rx="18.5"
        ry="11.8"
        transform="rotate(-35 66.5 65.5)"
        fill={cutoutColor}
      />
    </svg>
  );
}

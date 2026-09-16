"use client";

import { instituteInfo } from "@/constants/institute";

type Props = {
  /**
   * Pixel size of the seal (square). The seal scales its stroke widths and
   * font sizes proportionally to this value.
   */
  size?: number;
  /**
   * Optional rotation in degrees applied to the whole SVG. Lets you tilt the
   * seal a bit so it doesn't look stamped-straight.
   */
  rotate?: number;
  /**
   * Override the colour of the seal. Defaults to emerald to match the PAID
   * badge palette used elsewhere in the receipt.
   */
  color?: string;
  /**
   * Optional date label drawn under the PAID text — typically the receipt
   * date (e.g. "Sep 16, 2026").
   */
  dateLabel?: string;
  /**
   * Optional explicit name to show on the upper curve. Defaults to the
   * institute name from `constants/institute.ts`.
   */
  topText?: string;
  /**
   * Optional explicit address to show on the lower curve. Defaults to the
   * institute address.
   */
  bottomText?: string;
};

/**
 * A circular professional "PAID" seal drawn entirely with SVG — no external
 * image assets, no font dependencies. Curved text is handled with two
 * `<textPath>` arcs that go around the upper and lower halves of the seal.
 *
 * The component is intentionally lightweight so the same markup can be
 * produced as a raw HTML string for the print iframe (see
 * `utils/receiptTemplate.ts`).
 */
const PaymentSeal = ({
  size = 200,
  rotate = -20,
  color = "#059669", // emerald-600
  dateLabel,
  topText = instituteInfo.name,
  bottomText = instituteInfo.address,
}: Props) => {
  // Geometry: viewBox is 200x200, seal occupies a centered square of side S.
  const cx = 100;
  const cy = 100;
  const outerR = 92;
  const middleR = 80;
  const innerR = 60;
  const textTopR = 78;
  const textBottomR = 78;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label="PAID seal"
      style={{
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "center",
      }}
    >
      {/* Outer ring */}
      <circle
        cx={cx}
        cy={cy}
        r={outerR}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        opacity={0.9}
      />
      {/* Inner ring (thicker) — the seal's main border */}
      <circle
        cx={cx}
        cy={cy}
        r={middleR}
        fill="none"
        stroke={color}
        strokeWidth={4}
      />
      {/* Subtle innermost guide ring */}
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={0.6}
        strokeDasharray="2 3"
      />

      {/*
        Curved text along the upper half of the outer ring. The arc runs
        from 220° (lower-left) around the top to -40° (lower-right) so the
        text reads left-to-right across the top.
       */}
      <defs>
        <path
          id="seal-top-arc"
          d="M 35 100 A 20 20 0 0 1 165 100"
          fill="none"
        />
        <path
          id="seal-bottom-arc"
          d="M 29 103 A 65 65 0 0 0 171 103"
          fill="none"
        />
      </defs>

      <text
        fill={color}
        fontFamily="Poppins, Arial, sans-serif"
        fontSize="12"
        fontWeight="700"
        letterSpacing="2"
      >
        <textPath href="#seal-top-arc" startOffset="50%" textAnchor="middle">
          {(topText || instituteInfo.name).toUpperCase()}
        </textPath>
      </text>

      <text
        fill={color}
        fontFamily="Poppins, Arial, sans-serif"
        fontSize="9"
        fontWeight="600"
        letterSpacing="1.5"
      >
        <textPath href="#seal-bottom-arc" startOffset="50%" textAnchor="middle">
          {(bottomText || instituteInfo.address || "").toUpperCase()}
        </textPath>
      </text>

      {/* Ornament stars at 9 o'clock and 3 o'clock to separate the curves */}
      <g fill={color}>
        <polygon
          points="22,100 25,103 28,100 25,97"
          transform="translate(0,0)"
        />
        <polygon points="172,100 175,103 178,100 175,97" />
      </g>

      {/* Central PAID text */}
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fontFamily="Poppins, Arial, sans-serif"
        fontSize="28"
        fontWeight="900"
        letterSpacing="3"
        fill={color}
      >
        PAID
      </text>

      {/* Optional date caption beneath PAID */}
      {dateLabel && (
        <text
          x={cx}
          y={cy + 26}
          textAnchor="middle"
          fontFamily="Poppins, Arial, sans-serif"
          fontSize="7"
          fontWeight="600"
          letterSpacing="1"
          fill={color}
          opacity={0.85}
        >
          {dateLabel.toUpperCase()}
        </text>
      )}
    </svg>
  );
};

export default PaymentSeal;

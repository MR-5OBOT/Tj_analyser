import React from "react";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";

import { Trade } from "../lib/journals";
import { colors, fontFamily } from "../theme/tokens";

// The only share format — a 9:16 story canvas.
export const STORY = { w: 1080, h: 1920 };

type Row = { label: string; value: string; color: string };

const dash = (s: string | number | null | undefined) => (s === null || s === undefined || s === "" ? "—" : String(s));

// The detail-card rows (no NOTES), with the table's color coding applied to
// direction / outcome / R-R — the rest stay white.
function rowsFor(t: Trade): Row[] {
  const rrColor = t.rr == null || t.rr === 0 ? colors.textMuted : t.rr > 0 ? colors.positive : colors.danger;
  const outColor = t.outcome === "win" ? colors.positive : t.outcome === "loss" ? colors.danger : colors.textMuted;
  const dirColor = t.direction === "long" ? colors.positive : t.direction === "short" ? colors.danger : colors.text;
  return [
    { label: "DATE", value: t.date.replace(/-/g, "/"), color: colors.text },
    { label: "SYMBOL", value: dash(t.instrument), color: colors.text },
    { label: "DIRECTION", value: t.direction ? t.direction.toUpperCase() : "—", color: dirColor },
    { label: "ENTRY TIME", value: dash(t.entryTime), color: colors.text },
    { label: "SL SIZE", value: dash(t.slSize), color: colors.text },
    { label: "POSITION SIZE", value: dash(t.positionSize), color: colors.text },
    { label: "OUTCOME", value: t.outcome ? t.outcome.toUpperCase() : "—", color: outColor },
    { label: "R-R", value: t.rr == null ? "—" : `${t.rr > 0 ? "+" : ""}${t.rr}R`, color: rrColor },
    { label: "TAG", value: t.tag ? `#${t.tag}` : "—", color: colors.text },
  ];
}

/**
 * The trade-detail card rebuilt as a self-contained 9:16 SVG so react-native-svg
 * can rasterize it to a PNG (`toDataURL`) for sharing. Matches the in-app card,
 * minus the ✕, the NOTES row and the chart-link button. Absolute coords (SVG has
 * no flexbox); the card is centred in the canvas and always fits the tall story.
 */
export const TradeShareCard = React.forwardRef<React.ElementRef<typeof Svg>, { trade: Trade }>(
  function TradeShareCard({ trade }, ref) {
    const { w, h } = STORY;
    const rows = rowsFor(trade);

    const M = 56; // canvas → card margin
    const pad = 56; // card inner padding
    const headerH = 150; // header band height
    const rowH = 116;
    const cardW = w - 2 * M;
    const cardH = pad + headerH + rows.length * rowH + pad;
    const cardY = Math.max(M, (h - cardH) / 2); // vertically centred
    const innerL = M + pad;
    const innerR = M + cardW - pad;
    const rowsTop = cardY + pad + headerH;
    const header = `${trade.instrument || "—"} · ${trade.direction ? trade.direction.toUpperCase() : "—"}`;

    return (
      <Svg ref={ref} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <Rect x={0} y={0} width={w} height={h} fill={colors.background} />
        <Rect x={M} y={cardY} width={cardW} height={cardH} fill={colors.surface} stroke={colors.borderSoft} strokeWidth={3} />

        <SvgText x={innerL} y={cardY + pad + 62} fill={colors.text} fontFamily={fontFamily.bold} fontSize={62}>
          {header}
        </SvgText>

        {rows.map((r, i) => {
          const divY = rowsTop + i * rowH;
          const baseline = divY + rowH / 2 + 14;
          return (
            <React.Fragment key={r.label}>
              {i > 0 ? <Line x1={innerL} y1={divY} x2={innerR} y2={divY} stroke={colors.border} strokeWidth={2} /> : null}
              <SvgText x={innerL} y={baseline} fill={colors.textSubtle} fontFamily={fontFamily.medium} fontSize={32}>
                {r.label}
              </SvgText>
              <SvgText x={innerR} y={baseline} fill={r.color} fontFamily={fontFamily.bold} fontSize={44} textAnchor="end">
                {r.value}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    );
  },
);

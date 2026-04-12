from __future__ import annotations

from datetime import datetime
from math import ceil
from pathlib import Path
from textwrap import fill, shorten
from typing import Any

import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.patches import Circle, FancyBboxPatch

from backend.models import ExecutionReportRequest, ExecutionTrade

PAGE_SIZE = (8.27, 11.69)
IMAGE_SIZE = (8.0, 10.0)
BACKGROUND = "#F3F6F5"
SURFACE = "#FFFFFF"
SURFACE_ALT = "#F8FBFA"
HEADER = "#0D1715"
TEXT = "#111A18"
MUTED = "#5E6B68"
BORDER = "#D7E0DE"
ACCENT = "#466963"
ACCENT_SOFT = "#DCE7E4"
GREEN = "#2F8F72"
RED = "#B95454"
GRAY = "#9CAAA6"
IMAGE_BACKGROUND = "#020707"
IMAGE_SURFACE = "#071111"
IMAGE_SURFACE_ALT = "#0B1717"
IMAGE_BORDER = "#15302D"
IMAGE_TEXT = "#F4F8F7"
IMAGE_MUTED = "#8CA7A1"
IMAGE_SOFT = "#183936"


def prepare_execution_trades(trades: list[ExecutionTrade]) -> list[dict[str, Any]]:
    prepared_trades: list[dict[str, Any]] = []

    for index, trade in enumerate(trades, start=1):
        if not _trade_has_content(trade):
            continue

        risk_amount = _round_or_none(trade.risk_amount)
        pnl_amount = trade.pnl_amount
        rr_value = trade.rr

        if pnl_amount is None and risk_amount is not None and rr_value is not None:
            pnl_amount = risk_amount * rr_value

        if rr_value is None and risk_amount not in (None, 0) and pnl_amount is not None:
            rr_value = pnl_amount / risk_amount

        pnl_amount = _round_or_none(pnl_amount)
        rr_value = _round_or_none(rr_value, digits=2)

        prepared_trades.append(
            {
                "index": index,
                "asset": trade.asset.strip() or f"Trade {index}",
                "side": trade.side.upper(),
                "entry_time": trade.entry_time.strip(),
                "exit_time": trade.exit_time.strip(),
                "setup": trade.setup.strip(),
                "notes": trade.notes.strip(),
                "size": _round_or_none(trade.size),
                "risk_amount": risk_amount,
                "entry_price": _round_or_none(trade.entry_price),
                "exit_price": _round_or_none(trade.exit_price),
                "pnl_amount": pnl_amount,
                "rr": rr_value,
                "outcome": _classify_outcome(pnl_amount, rr_value),
            }
        )

    return prepared_trades


def build_execution_report_summary(
    report: ExecutionReportRequest,
    trades: list[dict[str, Any]],
) -> dict[str, Any]:
    currency = (report.base_currency or "USD").upper()
    pnl_values = [trade["pnl_amount"] or 0.0 for trade in trades]
    risk_values = [trade["risk_amount"] or 0.0 for trade in trades]
    rr_values = [trade["rr"] or 0.0 for trade in trades]

    has_explicit_pnl = any(trade["pnl_amount"] is not None for trade in trades)
    net_pnl = sum(pnl_values)
    balance_change = None
    if report.opening_balance is not None and report.closing_balance is not None:
        balance_change = round(report.closing_balance - report.opening_balance, 2)
        if not has_explicit_pnl:
            net_pnl = balance_change

    wins = sum(1 for trade in trades if trade["outcome"] == "Win")
    losses = sum(1 for trade in trades if trade["outcome"] == "Loss")
    breakeven = sum(1 for trade in trades if trade["outcome"] == "BE")
    trade_count = len(trades)
    win_rate = round((wins / trade_count) * 100, 1) if trade_count else 0.0
    total_r = round(sum(rr_values), 2)
    total_risk = round(sum(risk_values), 2)
    average_r = round(total_r / trade_count, 2) if trade_count else 0.0

    gross_profit = sum(value for value in pnl_values if value > 0)
    gross_loss = sum(value for value in pnl_values if value < 0)
    profit_factor = round(gross_profit / abs(gross_loss), 2) if gross_loss else None
    best_trade = round(max(pnl_values), 2) if pnl_values else 0.0
    worst_trade = round(min(pnl_values), 2) if pnl_values else 0.0

    running_total = 0.0
    cumulative_pnl: list[float] = []
    for value in pnl_values:
        running_total += value
        cumulative_pnl.append(round(running_total, 2))

    stats = {
        "Title": report.title.strip() or "Daily Execution Report",
        "Account": report.account_name.strip() or "Unspecified",
        "Session": report.session.strip() or "Unspecified",
        "Net PnL": _format_money(net_pnl, currency),
        "Total R": _format_r(total_r),
        "Trades": trade_count,
        "Win Rate": f"{win_rate:.1f}%",
        "Wins / Losses / BE": f"{wins} / {losses} / {breakeven}",
        "Total Risk": _format_money(total_risk, currency),
        "Average R": _format_r(average_r),
        "Best Trade": _format_money(best_trade, currency),
        "Worst Trade": _format_money(worst_trade, currency),
    }

    if balance_change is not None:
        stats["Balance Change"] = _format_money(balance_change, currency)
    if profit_factor is not None:
        stats["Profit Factor"] = profit_factor

    return {
        "title": report.title.strip() or "Daily Execution Report",
        "currency": currency,
        "trade_count": trade_count,
        "wins": wins,
        "losses": losses,
        "breakeven": breakeven,
        "win_rate": win_rate,
        "net_pnl": round(net_pnl, 2),
        "total_r": total_r,
        "total_risk": total_risk,
        "average_r": average_r,
        "best_trade": best_trade,
        "worst_trade": worst_trade,
        "balance_change": balance_change,
        "profit_factor": profit_factor,
        "cumulative_pnl": cumulative_pnl,
        "stats": stats,
    }


def export_execution_report_pdf(
    report: ExecutionReportRequest,
    trades: list[dict[str, Any]],
    summary: dict[str, Any],
    output_path: str | Path,
) -> str:
    pdf_path = str(output_path)
    rows_per_page = 7
    page_count = max(1, ceil(len(trades) / rows_per_page))

    with PdfPages(pdf_path) as pdf:
        cover_figure = _create_cover_page(report, trades, summary)
        pdf.savefig(cover_figure)
        plt.close(cover_figure)

        for page_number in range(page_count):
            start = page_number * rows_per_page
            end = start + rows_per_page
            figure = _create_trades_page(
                report,
                trades[start:end],
                summary,
                page_number + 1,
                page_count,
            )
            pdf.savefig(figure)
            plt.close(figure)

    return pdf_path


def export_execution_report_image(
    report: ExecutionReportRequest,
    trades: list[dict[str, Any]],
    summary: dict[str, Any],
    output_path: str | Path,
) -> str:
    image_path = str(output_path)
    figure = _create_execution_image(report, trades, summary)
    figure.savefig(image_path, dpi=180, facecolor=figure.get_facecolor())
    plt.close(figure)
    return image_path


def _create_cover_page(
    report: ExecutionReportRequest,
    trades: list[dict[str, Any]],
    summary: dict[str, Any],
):
    figure = plt.figure(figsize=PAGE_SIZE)
    ax = figure.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    figure.patch.set_facecolor(BACKGROUND)
    ax.set_facecolor(BACKGROUND)

    _panel(ax, 0.05, 0.84, 0.90, 0.12, facecolor=HEADER, edgecolor=HEADER, radius=0.035)
    _panel(ax, 0.05, 0.62, 0.90, 0.16, facecolor=SURFACE, edgecolor=BORDER, radius=0.025)
    _panel(ax, 0.05, 0.07, 0.90, 0.18, facecolor=SURFACE, edgecolor=BORDER, radius=0.025)

    ax.text(0.08, 0.92, summary["title"], fontsize=22, fontweight="bold", color="white", ha="left", va="center")
    ax.text(
        0.08,
        0.88,
        f"{report.report_date.strftime('%d %b %Y')}  •  {report.account_name.strip() or 'Manual account'}",
        fontsize=11.5,
        color="#C9D7D3",
        ha="left",
        va="center",
    )
    ax.text(
        0.08,
        0.855,
        "Manual trade capture, risk context, and export-ready execution summary.",
        fontsize=10.5,
        color="#AAB9B5",
        ha="left",
        va="center",
    )

    stat_cards = [
        ("Net PnL", _format_money(summary["net_pnl"], summary["currency"])),
        ("Trades", str(summary["trade_count"])),
        ("Win Rate", f"{summary['win_rate']:.1f}%"),
        ("Total R", _format_r(summary["total_r"])),
    ]
    card_x_positions = [0.05, 0.275, 0.50, 0.725]
    for (label, value), x_position in zip(stat_cards, card_x_positions, strict=False):
        _stat_card(ax, x_position, 0.73, 0.205, 0.08, label, value)

    metadata_lines = [
        ("Account cycle", report.account_cycle.strip() or "Unspecified"),
        ("Account type", report.account_type.strip() or "Unspecified"),
        ("Platform", report.platform.strip() or "Unspecified"),
        ("Session", report.session.strip() or "Unspecified"),
        ("Opening balance", _format_money(report.opening_balance, summary["currency"])),
        ("Closing balance", _format_money(report.closing_balance, summary["currency"])),
        ("Daily risk cap", _format_percent(report.daily_risk_limit)),
        ("Profit factor", "N/A" if summary["profit_factor"] is None else str(summary["profit_factor"])),
    ]
    for index, (label, value) in enumerate(metadata_lines):
        column = index % 2
        row = index // 2
        base_x = 0.08 if column == 0 else 0.52
        base_y = 0.74 - row * 0.036
        ax.text(base_x, base_y, label.upper(), fontsize=8.5, color=MUTED, ha="left", va="center")
        ax.text(base_x, base_y - 0.017, value, fontsize=11.2, color=TEXT, fontweight="bold", ha="left", va="center")

    _equity_curve_chart(figure, summary)
    _execution_snapshot_panel(figure, trades, summary)

    ax.text(0.08, 0.22, "SESSION NOTES", fontsize=9, color=MUTED, ha="left", va="center")
    ax.text(
        0.08,
        0.185,
        fill(report.notes.strip() or "No session notes were added for this report.", width=100),
        fontsize=10.8,
        color=TEXT,
        ha="left",
        va="top",
    )

    footer = (
        f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}  •  "
        f"{len(trades)} logged trades  •  TJ Analyser"
    )
    ax.text(0.08, 0.035, footer, fontsize=8.5, color=MUTED, ha="left", va="center")
    return figure


def _create_execution_image(
    report: ExecutionReportRequest,
    trades: list[dict[str, Any]],
    summary: dict[str, Any],
):
    figure = plt.figure(figsize=IMAGE_SIZE)
    ax = figure.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    figure.patch.set_facecolor(IMAGE_BACKGROUND)
    ax.set_facecolor(IMAGE_BACKGROUND)

    for x_pos, y_pos, radius, color, alpha in (
        (0.16, 0.08, 0.20, "#0F6650", 0.16),
        (0.86, 0.92, 0.18, "#2B5147", 0.10),
        (0.76, 0.22, 0.14, "#123730", 0.12),
    ):
        ax.add_patch(Circle((x_pos, y_pos), radius=radius, color=color, alpha=alpha, linewidth=0))

    _panel(ax, 0.05, 0.04, 0.90, 0.92, facecolor="#040909", edgecolor="#1B2827", radius=0.04, linewidth=1.1)
    _panel(ax, 0.09, 0.77, 0.82, 0.15, facecolor=IMAGE_SURFACE, edgecolor=IMAGE_BORDER, radius=0.03)
    _panel(ax, 0.09, 0.54, 0.82, 0.18, facecolor=IMAGE_SURFACE, edgecolor=IMAGE_BORDER, radius=0.03)
    _panel(ax, 0.09, 0.24, 0.82, 0.31, facecolor=IMAGE_SURFACE, edgecolor=IMAGE_BORDER, radius=0.03)
    _panel(ax, 0.09, 0.08, 0.82, 0.11, facecolor="#071010", edgecolor=IMAGE_BORDER, radius=0.03)

    ax.text(0.11, 0.90, "ANDROID + CLOUD", fontsize=8.5, color=IMAGE_MUTED, ha="left", va="center")
    ax.text(0.11, 0.872, summary["title"], fontsize=19, fontweight="bold", color=IMAGE_TEXT, ha="left", va="center")
    ax.text(
        0.11,
        0.843,
        f"{report.report_date.strftime('%d %b %Y')}  •  {report.account_name.strip() or 'Execution Desk'}",
        fontsize=10.5,
        color="#B9CBC7",
        ha="left",
        va="center",
    )
    ax.text(
        0.11,
        0.818,
        f"{report.session.strip() or 'Session pending'}  •  {report.platform.strip() or 'Manual report'}  •  Risk cap {_format_percent(report.daily_risk_limit)}",
        fontsize=9.2,
        color="#A8BBB7",
        ha="left",
        va="center",
    )
    ax.text(
        0.11,
        0.792,
        "One-card execution recap built for preview, export, and sharing.",
        fontsize=9.2,
        color=IMAGE_MUTED,
        ha="left",
        va="center",
    )
    _pill(ax, 0.71, 0.865, 0.16, 0.04, "TRADE SNAPSHOT", facecolor="#10211E", edgecolor="#20423D", color="#A0E1D0")

    stat_cards = [
        ("Net PnL", _format_money(summary["net_pnl"], summary["currency"])),
        ("Trades", str(summary["trade_count"])),
        ("Win Rate", f"{summary['win_rate']:.0f}%"),
        ("Total R", _format_r(summary["total_r"])),
    ]
    stat_positions = [0.09, 0.305, 0.52, 0.735]
    for (label, value), x_pos in zip(stat_cards, stat_positions, strict=False):
        _dark_stat_card(ax, x_pos, 0.645, 0.175, 0.055, label, value)

    _execution_image_chart(figure, summary)
    _execution_image_outcomes(ax, summary)

    ax.text(0.11, 0.515, "TRADE TAPE", fontsize=8.5, color=IMAGE_MUTED, ha="left", va="center")
    ax.text(0.11, 0.488, "Top executions from the session, compressed into one shareable card.", fontsize=9, color="#A8BBB7", ha="left", va="center")

    preview_trades = trades[:4]
    if not preview_trades:
        _panel(ax, 0.11, 0.30, 0.78, 0.16, facecolor=IMAGE_SURFACE_ALT, edgecolor=IMAGE_BORDER, radius=0.025)
        ax.text(0.14, 0.39, "No trades logged", fontsize=12, color=IMAGE_TEXT, fontweight="bold", ha="left", va="center")
        ax.text(
            0.14,
            0.35,
            "Add executions and the image will turn into a trading-platform style recap.",
            fontsize=9.2,
            color=IMAGE_MUTED,
            ha="left",
            va="center",
            wrap=True,
        )
    else:
        for index, trade in enumerate(preview_trades):
            row_y = 0.445 - (index * 0.075)
            _draw_execution_image_trade(ax, trade, summary["currency"], row_y)

    ax.text(0.11, 0.165, "SESSION NOTE", fontsize=8.2, color=IMAGE_MUTED, ha="left", va="center")
    ax.text(
        0.11,
        0.125,
        fill(report.notes.strip() or "No session notes were added.", width=58),
        fontsize=9.8,
        color="#D7E0DE",
        ha="left",
        va="center",
    )
    ax.text(
        0.89,
        0.10,
        f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        fontsize=7.8,
        color="#7B918C",
        ha="right",
        va="center",
    )
    return figure


def _create_trades_page(
    report: ExecutionReportRequest,
    trades: list[dict[str, Any]],
    summary: dict[str, Any],
    page_number: int,
    page_count: int,
):
    figure = plt.figure(figsize=PAGE_SIZE)
    ax = figure.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    figure.patch.set_facecolor(BACKGROUND)
    ax.set_facecolor(BACKGROUND)

    _panel(ax, 0.05, 0.89, 0.90, 0.07, facecolor=HEADER, edgecolor=HEADER, radius=0.03)
    ax.text(0.08, 0.925, "Execution Log", fontsize=18, fontweight="bold", color="white", ha="left", va="center")
    ax.text(
        0.92,
        0.925,
        f"Page {page_number} / {page_count}",
        fontsize=10.5,
        color="#C9D7D3",
        ha="right",
        va="center",
    )
    ax.text(
        0.08,
        0.895,
        f"{report.report_date.strftime('%d %b %Y')}  •  {report.account_name.strip() or 'Manual account'}  •  Net {_format_money(summary['net_pnl'], summary['currency'])}",
        fontsize=10,
        color="#AAB9B5",
        ha="left",
        va="center",
    )

    _panel(ax, 0.05, 0.08, 0.90, 0.77, facecolor=SURFACE, edgecolor=BORDER, radius=0.025)

    table_left = 0.07
    table_width = 0.86
    header_top = 0.82
    row_height = 0.095
    column_specs = [
        ("#", 0.05, "center"),
        ("Asset / Time", 0.19, "left"),
        ("Side", 0.08, "center"),
        ("Setup / Notes", 0.25, "left"),
        ("Size", 0.06, "right"),
        ("Risk", 0.08, "right"),
        ("Entry", 0.08, "right"),
        ("Exit", 0.08, "right"),
        ("PnL", 0.08, "right"),
        ("R", 0.05, "right"),
    ]

    current_x = table_left
    for label, width, alignment in column_specs:
        factor = 0.5 if alignment == "center" else 0.02 if alignment == "left" else 0.98
        x_position = current_x + (table_width * width * factor)
        ax.text(x_position, header_top, label.upper(), fontsize=8.5, color=MUTED, ha=alignment, va="center")
        current_x += table_width * width

    ax.plot([table_left, table_left + table_width], [header_top - 0.02, header_top - 0.02], color=BORDER, linewidth=1)

    for row_index, trade in enumerate(trades):
        row_y = header_top - 0.07 - row_index * row_height
        background_color = SURFACE_ALT if row_index % 2 == 0 else SURFACE
        _panel(
            ax,
            table_left,
            row_y - 0.04,
            table_width,
            0.072,
            facecolor=background_color,
            edgecolor=BORDER,
            radius=0.012,
            linewidth=0.8,
        )

        cell_offsets: dict[str, tuple[float, float, str]] = {}
        current_x = table_left
        for label, width, alignment in column_specs:
            cell_offsets[label] = (current_x, table_width * width, alignment)
            current_x += table_width * width

        def _cell_x(label: str) -> float:
            cell_left, cell_width, alignment = cell_offsets[label]
            if alignment == "center":
                return cell_left + (cell_width * 0.5)
            if alignment == "right":
                return cell_left + (cell_width * 0.98)
            return cell_left + (cell_width * 0.02)

        top_line_y = row_y + 0.012
        bottom_line_y = row_y - 0.015
        time_value = " / ".join(part for part in [trade["entry_time"], trade["exit_time"]] if part) or "No time"
        notes_value = trade["notes"] or "No notes"

        ax.text(_cell_x("#"), row_y, str(trade["index"]), fontsize=9.2, color=TEXT, ha="center", va="center")
        ax.text(_cell_x("Asset / Time"), top_line_y, shorten(trade["asset"], width=18, placeholder="..."), fontsize=10, color=TEXT, ha="left", va="center")
        ax.text(_cell_x("Asset / Time"), bottom_line_y, shorten(time_value, width=18, placeholder="..."), fontsize=8.2, color=MUTED, ha="left", va="center")
        ax.text(
            _cell_x("Side"),
            row_y,
            trade["side"],
            fontsize=9.2,
            color=GREEN if trade["side"] == "LONG" else RED,
            ha="center",
            va="center",
        )
        ax.text(_cell_x("Setup / Notes"), top_line_y, shorten(trade["setup"] or "No setup", width=24, placeholder="..."), fontsize=10, color=TEXT, ha="left", va="center")
        ax.text(_cell_x("Setup / Notes"), bottom_line_y, shorten(notes_value, width=24, placeholder="..."), fontsize=8.2, color=MUTED, ha="left", va="center")
        ax.text(_cell_x("Size"), row_y, _format_decimal(trade["size"]), fontsize=9.2, color=TEXT, ha="right", va="center")
        ax.text(_cell_x("Risk"), row_y, _format_compact_money(trade["risk_amount"], summary["currency"]), fontsize=9.2, color=TEXT, ha="right", va="center")
        ax.text(_cell_x("Entry"), row_y, _format_decimal(trade["entry_price"]), fontsize=9.2, color=TEXT, ha="right", va="center")
        ax.text(_cell_x("Exit"), row_y, _format_decimal(trade["exit_price"]), fontsize=9.2, color=TEXT, ha="right", va="center")
        pnl_cell_left, pnl_cell_width, _ = cell_offsets["PnL"]
        pnl_x = pnl_cell_left + (pnl_cell_width * 0.90)
        ax.text(
            pnl_x,
            row_y,
            _format_compact_money(trade["pnl_amount"], summary["currency"]),
            fontsize=9.2,
            color=GREEN if trade["outcome"] == "Win" else RED if trade["outcome"] == "Loss" else TEXT,
            ha="right",
            va="center",
        )
        ax.text(_cell_x("R"), row_y, _format_r(trade["rr"], empty_value="—"), fontsize=9.2, color=TEXT, ha="right", va="center")

    footer_lines = [
        f"Rows on this page: {len(trades)}",
        f"Total report trades: {summary['trade_count']}",
        f"Win rate: {summary['win_rate']:.1f}%",
        f"Total R: {_format_r(summary['total_r'])}",
    ]
    ax.text(0.08, 0.055, "  •  ".join(footer_lines), fontsize=9, color=MUTED, ha="left", va="center")
    return figure


def _equity_curve_chart(figure, summary: dict[str, Any]) -> None:
    axis = figure.add_axes([0.08, 0.31, 0.52, 0.23])
    axis.set_facecolor(SURFACE)
    for spine in axis.spines.values():
        spine.set_color(BORDER)
    axis.tick_params(colors=MUTED, labelsize=8)
    axis.grid(True, color="#E6EEEC", linewidth=0.8)
    axis.set_title("Cumulative PnL", loc="left", fontsize=11, color=TEXT, pad=12, fontweight="bold")

    cumulative_values = summary["cumulative_pnl"]
    if not cumulative_values:
        axis.text(0.5, 0.5, "No PnL values available", ha="center", va="center", color=MUTED, fontsize=10)
        axis.set_xticks([])
        axis.set_yticks([])
        return

    x_values = list(range(1, len(cumulative_values) + 1))
    axis.axhline(0, color=BORDER, linewidth=1)
    axis.plot(x_values, cumulative_values, color=ACCENT, linewidth=2.6)
    axis.fill_between(x_values, cumulative_values, 0, color=ACCENT_SOFT)
    axis.set_xlabel("Trade #", fontsize=8.5, color=MUTED)
    axis.set_ylabel("PnL", fontsize=8.5, color=MUTED)


def _execution_snapshot_panel(
    figure,
    trades: list[dict[str, Any]],
    summary: dict[str, Any],
) -> None:
    axis = figure.add_axes([0.66, 0.31, 0.26, 0.23])
    axis.set_facecolor(HEADER)
    axis.set_xlim(0, 1)
    axis.set_ylim(0, 1)
    axis.set_xticks([])
    axis.set_yticks([])
    for spine in axis.spines.values():
        spine.set_visible(False)

    axis.text(0.06, 0.92, "Execution Image", fontsize=11, color="white", fontweight="bold", ha="left", va="center")
    axis.text(
        0.06,
        0.84,
        f"{summary['wins']}W • {summary['losses']}L • {summary['breakeven']} BE",
        fontsize=9,
        color="#ADC3BE",
        ha="left",
        va="center",
    )

    top_trades = trades[:3]
    if not top_trades:
        axis.text(0.06, 0.56, "No trades logged", fontsize=11, color="#D4DEDB", ha="left", va="center")
        axis.text(
            0.06,
            0.47,
            "Add executions to generate a live trade tape on the report cover.",
            fontsize=8.5,
            color="#8EA39E",
            ha="left",
            va="center",
            wrap=True,
        )
    else:
        max_scale = max(abs(trade["rr"] or 0) for trade in top_trades) or 1
        for index, trade in enumerate(top_trades):
            row_y = 0.72 - (index * 0.2)
            color = GREEN if trade["outcome"] == "Win" else RED if trade["outcome"] == "Loss" else GRAY
            magnitude = abs(trade["rr"] or 0)
            bar_width = 0.2 + (0.48 * (magnitude / max_scale if max_scale else 0))

            track = FancyBboxPatch(
                (0.06, row_y - 0.07),
                0.88,
                0.11,
                boxstyle="round,pad=0.006,rounding_size=0.02",
                linewidth=0,
                facecolor="#122120",
            )
            bar = FancyBboxPatch(
                (0.06, row_y - 0.07),
                bar_width,
                0.11,
                boxstyle="round,pad=0.006,rounding_size=0.02",
                linewidth=0,
                facecolor=color,
                alpha=0.28,
            )
            axis.add_patch(track)
            axis.add_patch(bar)

            axis.text(
                0.09,
                row_y + 0.012,
                shorten(trade["asset"] or f"Trade {index + 1}", width=14, placeholder="..."),
                fontsize=8.8,
                color="white",
                fontweight="bold",
                ha="left",
                va="center",
            )
            axis.text(
                0.09,
                row_y - 0.03,
                trade["setup"] or "Setup pending",
                fontsize=7.8,
                color="#B7C9C5",
                ha="left",
                va="center",
            )
            axis.text(
                0.91,
                row_y + 0.012,
                trade["side"],
                fontsize=7.5,
                color="#A6BCB7",
                ha="right",
                va="center",
            )
            axis.text(
                0.91,
                row_y - 0.028,
                f"{_format_compact_money(trade['pnl_amount'], summary['currency'])}  {_format_r(trade['rr'], empty_value='—')}",
                fontsize=7.4,
                color="white",
                ha="right",
                va="center",
            )

    axis.text(
        0.06,
        0.08,
        f"Total risk {_format_money(summary['total_risk'], summary['currency'])}  •  Avg {_format_r(summary['average_r'])}",
        fontsize=8.2,
        color="#93AAA5",
        ha="left",
        va="center",
    )


def _execution_image_chart(figure, summary: dict[str, Any]) -> None:
    axis = figure.add_axes([0.11, 0.565, 0.50, 0.065])
    axis.set_facecolor(IMAGE_SURFACE)
    axis.set_xticks([])
    axis.tick_params(colors=IMAGE_MUTED, labelsize=7.5)
    for spine in axis.spines.values():
        spine.set_color(IMAGE_BORDER)
        spine.set_linewidth(1)

    cumulative_values = summary["cumulative_pnl"]
    if not cumulative_values:
        axis.text(0.5, 0.5, "No PnL values available", ha="center", va="center", color=IMAGE_MUTED, fontsize=8.2)
        axis.set_yticks([])
        return

    x_values = list(range(1, len(cumulative_values) + 1))
    axis.axhline(0, color="#27423D", linewidth=1)
    axis.plot(x_values, cumulative_values, color="#9FE1D0", linewidth=2.2)
    axis.fill_between(x_values, cumulative_values, 0, color="#2C6257", alpha=0.35)
    axis.grid(True, axis="y", color="#18332F", linewidth=0.7)
    axis.set_title("Cumulative PnL", loc="left", fontsize=8.2, color=IMAGE_TEXT, pad=7, fontweight="bold")


def _execution_image_outcomes(ax, summary: dict[str, Any]) -> None:
    _panel(ax, 0.64, 0.554, 0.25, 0.076, facecolor=IMAGE_SURFACE_ALT, edgecolor=IMAGE_BORDER, radius=0.025)
    ax.text(0.66, 0.613, "DESK SCORE", fontsize=7.4, color=IMAGE_MUTED, ha="left", va="center")
    ax.text(
        0.66,
        0.589,
        f"{summary['wins']}W  •  {summary['losses']}L  •  {summary['breakeven']} BE",
        fontsize=9.2,
        color=IMAGE_TEXT,
        fontweight="bold",
        ha="left",
        va="center",
    )
    ax.text(
        0.66,
        0.565,
        f"Risk {_format_compact_money(summary['total_risk'], summary['currency'])}",
        fontsize=7.3,
        color="#B8CCC7",
        ha="left",
        va="center",
    )
    ax.text(
        0.87,
        0.565,
        f"Average {_format_r(summary['average_r'])}",
        fontsize=7.3,
        color="#B8CCC7",
        ha="right",
        va="center",
    )


def _draw_execution_image_trade(ax, trade: dict[str, Any], currency: str, row_y: float) -> None:
    outcome_color = _trade_outcome_color(trade["outcome"])
    _panel(ax, 0.11, row_y - 0.028, 0.78, 0.06, facecolor=IMAGE_SURFACE_ALT, edgecolor=IMAGE_BORDER, radius=0.022)
    _pill(
        ax,
        0.13,
        row_y + 0.008,
        0.08,
        0.022,
        trade["side"],
        facecolor="#17312C" if trade["side"] == "LONG" else "#371B1B",
        edgecolor="#1F413B" if trade["side"] == "LONG" else "#4B2626",
        color=IMAGE_TEXT,
        fontsize=7,
    )
    ax.text(
        0.23,
        row_y + 0.009,
        shorten(trade["asset"], width=14, placeholder="..."),
        fontsize=11,
        color=IMAGE_TEXT,
        fontweight="bold",
        ha="left",
        va="center",
    )
    ax.text(
        0.23,
        row_y - 0.012,
        shorten(trade["setup"] or "Setup pending", width=28, placeholder="..."),
        fontsize=8,
        color=IMAGE_MUTED,
        ha="left",
        va="center",
    )
    ax.text(
        0.54,
        row_y - 0.012,
        f"Entry {_format_decimal(trade['entry_price'])}  Exit {_format_decimal(trade['exit_price'])}",
        fontsize=7.8,
        color="#ACC2BD",
        ha="left",
        va="center",
    )
    ax.text(
        0.87,
        row_y + 0.010,
        _format_compact_money(trade["pnl_amount"], currency),
        fontsize=10.5,
        color=outcome_color,
        fontweight="bold",
        ha="right",
        va="center",
    )
    ax.text(
        0.87,
        row_y - 0.012,
        _format_r(trade["rr"], empty_value="—"),
        fontsize=8,
        color="#A8BBB7",
        ha="right",
        va="center",
    )


def _pill(
    ax,
    x: float,
    y: float,
    width: float,
    height: float,
    text: str,
    *,
    facecolor: str,
    edgecolor: str,
    color: str,
    fontsize: float = 8.0,
) -> None:
    _panel(ax, x, y, width, height, facecolor=facecolor, edgecolor=edgecolor, radius=0.02, linewidth=1)
    ax.text(x + (width / 2), y + (height / 2), text, fontsize=fontsize, color=color, fontweight="bold", ha="center", va="center")


def _dark_stat_card(ax, x: float, y: float, width: float, height: float, label: str, value: str) -> None:
    _panel(ax, x, y, width, height, facecolor=IMAGE_SURFACE_ALT, edgecolor=IMAGE_BORDER, radius=0.022)
    ax.text(x + 0.018, y + height - 0.012, label.upper(), fontsize=6.8, color=IMAGE_MUTED, ha="left", va="top")
    ax.text(x + 0.018, y + 0.013, value, fontsize=12.8, fontweight="bold", color=IMAGE_TEXT, ha="left", va="bottom")


def _trade_outcome_color(outcome: str) -> str:
    if outcome == "Win":
        return "#8BE0C6"
    if outcome == "Loss":
        return "#F0A0A0"
    return IMAGE_TEXT


def _trade_has_content(trade: ExecutionTrade) -> bool:
    text_values = [trade.asset, trade.entry_time, trade.exit_time, trade.setup, trade.notes]
    if any(value.strip() for value in text_values):
        return True

    numeric_values = [
        trade.size,
        trade.risk_amount,
        trade.entry_price,
        trade.exit_price,
        trade.pnl_amount,
        trade.rr,
    ]
    return any(value is not None for value in numeric_values)


def _classify_outcome(pnl_amount: float | None, rr_value: float | None) -> str:
    value = pnl_amount if pnl_amount is not None else rr_value
    if value is None:
        return "BE"
    if value > 0:
        return "Win"
    if value < 0:
        return "Loss"
    return "BE"


def _panel(
    ax,
    x: float,
    y: float,
    width: float,
    height: float,
    *,
    facecolor: str,
    edgecolor: str,
    radius: float,
    linewidth: float = 1.0,
) -> None:
    patch = FancyBboxPatch(
        (x, y),
        width,
        height,
        boxstyle=f"round,pad=0.008,rounding_size={radius}",
        linewidth=linewidth,
        facecolor=facecolor,
        edgecolor=edgecolor,
    )
    ax.add_patch(patch)


def _stat_card(ax, x: float, y: float, width: float, height: float, label: str, value: str) -> None:
    _panel(ax, x, y, width, height, facecolor=SURFACE, edgecolor=BORDER, radius=0.02)
    ax.text(x + 0.02, y + height - 0.022, label.upper(), fontsize=8.5, color=MUTED, ha="left", va="top")
    ax.text(x + 0.02, y + 0.025, value, fontsize=17, fontweight="bold", color=TEXT, ha="left", va="bottom")


def _currency_prefix(currency: str) -> str:
    symbols = {
        "USD": "$",
        "EUR": "EUR ",
        "GBP": "GBP ",
        "MAD": "MAD ",
    }
    return symbols.get(currency.upper(), f"{currency.upper()} ")


def _format_money(value: float | None, currency: str) -> str:
    if value is None:
        return "—"
    prefix = _currency_prefix(currency)
    sign = "-" if value < 0 else ""
    return f"{sign}{prefix}{abs(value):,.2f}"


def _format_compact_money(value: float | None, currency: str) -> str:
    if value is None:
        return "—"
    prefix = _currency_prefix(currency)
    sign = "-" if value < 0 else ""
    return f"{sign}{prefix}{abs(value):,.0f}"


def _format_r(value: float | None, *, empty_value: str = "0.00R") -> str:
    if value is None:
        return empty_value
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.2f}R"


def _format_percent(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{value:.2f}%"


def _format_decimal(value: float | None) -> str:
    if value is None:
        return "—"
    if float(value).is_integer():
        return f"{value:.0f}"
    return f"{value:,.2f}"


def _round_or_none(value: float | None, *, digits: int = 2) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)

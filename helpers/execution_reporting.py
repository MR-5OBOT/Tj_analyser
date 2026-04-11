from __future__ import annotations

from datetime import datetime
from math import ceil
from pathlib import Path
from textwrap import fill, shorten
from typing import Any

import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.patches import FancyBboxPatch

from backend.models import ExecutionReportRequest, ExecutionTrade

PAGE_SIZE = (8.27, 11.69)
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
    _outcome_breakdown_chart(figure, summary)

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


def _outcome_breakdown_chart(figure, summary: dict[str, Any]) -> None:
    axis = figure.add_axes([0.66, 0.31, 0.26, 0.23])
    axis.set_facecolor(SURFACE)
    for spine in axis.spines.values():
        spine.set_color(BORDER)
    axis.set_title("Outcome Mix", loc="left", fontsize=11, color=TEXT, pad=12, fontweight="bold")

    labels = ["Wins", "Losses", "BE"]
    values = [summary["wins"], summary["losses"], summary["breakeven"]]
    axis.bar(labels, values, color=[GREEN, RED, GRAY], width=0.55)
    axis.tick_params(colors=MUTED, labelsize=8)
    axis.grid(axis="y", color="#E6EEEC", linewidth=0.8)
    axis.set_ylim(0, max(values + [1]) + 1)


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

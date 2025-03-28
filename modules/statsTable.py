import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


def create_stats_table(stats):
    # Create a figure with a table
    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.axis("off")

    # Convert stats dictionary to a list of lists for the table
    table_data = [[k, v] for k, v in stats.items()]

    # Create the table
    table = ax.table(
        cellText=table_data, colLabels=["Statistic", "Value"], loc="center", cellLoc="center", colColours=["#111111", "#111111"]
    )

    # Style the table
    table.auto_set_font_size(False)
    table.set_fontsize(12)
    table.scale(1.2, 1.5)

    # Set background colors
    for (i, j), cell in table.get_celld().items():
        if i == 0:  # Header row
            cell.set_facecolor("#111111")
            cell.set_text_props(color="white", weight="bold")
        else:
            cell.set_facecolor("#111111")
            cell.set_text_props(color="white")

    plt.title("Trading Performance Summary", pad=20, color="white")
    plt.tight_layout()
    return fig

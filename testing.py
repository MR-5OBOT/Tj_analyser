import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns


# risk vs profit
def risk_vs_profit(df):
    df_copy = df.copy()
    x = df_copy["risk_by_percentage"].str.replace("%", "").astype(float)
    y = df_copy["p/l_by_percentage"].str.replace("%", "").astype(float)
    sns.scatterplot(x=x, y=y, data=df, hue="outcome")
    plt.show()


# distribution of risks
def hist_risks(df):
    df_copy = df.copy()
    risks = df_copy["risk_by_percentage"].str.replace("%", "").astype(float)
    sns.histplot(risks, bins=15, kde=True)
    plt.show()


# bar plot
def bar_plot(df):
    df_copy = df.copy()
    dow = df_copy["risk_by_percentage"].str.replace("%", "").astype(float)
    outcome = df["outcome"]
    sns.barplot(x=dow, y=outcome, hue=df["outcome"])
    plt.show()


# boxplot
def boxplot(df):
    df_copy = df.copy()
    pl = df_copy["risk_by_percentage"].str.replace("%", "").astype(float)
    sns.boxplot(x=df["DoW"], y=pl, hue=df["outcome"])
    plt.show()


# tripplot
def stripplot(df):
    df_copy = df.copy()
    # pl = df_copy["risk_by_percentage"].str.replace("%", "").astype(float)
    pl = df["p/l_by_rr"]
    sns.stripplot(x=df["DoW"], y=pl, hue=df["outcome"])
    plt.show()


# jointplot (risk vs reward)
def jointplot_risk_vs_reward(df):
    # df_copy = df.copy()
    x = df["risk_by_percentage"].str.replace("%", "").astype(float)
    y = df["p/l_by_percentage"].str.replace("%", "").astype(float)
    sns.jointplot(x=x, y=y, hue=df["outcome"])
    plt.show()


# pairplot num value
def pairplot(df):
    sns.pairplot(df.select_dtypes(["number"]))
    plt.show()


def heatmap_avg_rr(df):
    """
    A heatmap shows the Cumulative sum of R/R over Day of week & Hour of day
    """
    # Convert entry_time to time and extract hours (without adding to df)
    hours = pd.to_datetime(df["entry_time"], format="%H:%M", errors="coerce").dt.time.apply(
        lambda x: x.hour if pd.notna(x) else None
    )
    # Create pivot table: hours as index, DoW as columns, p/l_by_rr as values
    matrix = df.pivot_table(values="p/l_by_rr", index=hours, columns="DoW", aggfunc="sum")  # aggfunc="sum", "mean"
    print(matrix)

    # Plot heatmap
    plt.style.use("dark_background")
    plt.figure(figsize=(10, 6))
    sns.heatmap(matrix, annot=True, cmap="RdBu_r")
    plt.title("Sum of R/R by Days vs Hours")
    plt.xlabel("")
    plt.ylabel("Hour of Entry")
    plt.yticks(rotation=0)  # Adjust rotation for readability
    plt.tight_layout()
    plt.savefig("./exported_data/days_vs_hours_rr.png")
    plt.show()


if __name__ == "__main__":
    df = pd.read_csv("./exported_data/output_data.csv")
    # risk_vs_profit(df)
    # hist_risks(df)
    # bar_plot(df)
    # boxplot(df)
    # stripplot(df)
    # jointplot_risk_vs_reward(df)
    # pairplot(df)
    heatmap_avg_rr(df)
    df.to_csv("./exported_data/output_data.csv", index=False)

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


if __name__ == "__main__":
    df = pd.read_csv("./exported_data/output_data.csv")
    print(df.head())
    # risk_vs_profit(df)
    # hist_risks(df)
    # bar_plot(df)
    boxplot(df)

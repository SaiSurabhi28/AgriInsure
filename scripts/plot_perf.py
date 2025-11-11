import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / 'perf-results.csv'
OUTPUT_DIR = BASE_DIR / 'perf-charts'
OUTPUT_DIR.mkdir(exist_ok=True)

def load_data():
    df = pd.read_csv(CSV_PATH)
    df['gas_used'] = df['gas_used'].astype(int)
    return df

def bar_chart(df):
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.bar(df['label'], df['gas_used'] / 1000, color=['#4f6d7a' if 'create' not in lbl else '#56a3a6' for lbl in df['label']])
    ax.set_ylabel('Gas used (×10^3 units)')
    ax.set_xlabel('Transaction label')
    ax.set_title('Gas usage by operation (Hardhat)')
    ax.set_ylim(0, max(df['gas_used'] / 1000) * 1.15)
    ax.grid(axis='y', alpha=0.3)
    for idx, val in enumerate(df['gas_used'] / 1000):
      ax.text(idx, val + 1, f"{val:.1f}", ha='center', va='bottom', fontsize=8)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / 'gas_bar.png', dpi=200)


def pie_chart(df):
    fig, ax = plt.subplots(figsize=(5, 5))
    grouped = df.groupby('operation')['gas_used'].sum()
    ax.pie(grouped, labels=grouped.index, autopct='%1.1f%%', startangle=140)
    ax.set_title('Gas distribution by operation type')
    fig.savefig(OUTPUT_DIR / 'gas_pie.png', dpi=200)


def cumulative_line(df):
    fig, ax = plt.subplots(figsize=(8, 4.5))
    running = df['gas_used'].cumsum()
    ax.plot(df['label'], running / 1000, marker='o')
    ax.set_ylabel('Cumulative gas (×10^3 units)')
    ax.set_xlabel('Transaction sequence')
    ax.set_title('Cumulative gas vs. transaction count')
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / 'gas_cumulative.png', dpi=200)


def main():
    df = load_data()
    bar_chart(df)
    pie_chart(df)
    cumulative_line(df)
    print(f"Charts saved to {OUTPUT_DIR}")


if __name__ == '__main__':
    main()

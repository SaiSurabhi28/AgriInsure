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
    df['duration_ms'] = df['duration_ms'].astype(float)
    return df


def avg_gas_bar(df):
    grouped = (
        df.groupby('operation')['gas_used']
        .mean()
        .sort_values(ascending=False)
    )
    fig, ax = plt.subplots(figsize=(7, 4.5))
    ax.bar(grouped.index, grouped / 1000, color='#56a3a6')
    ax.set_ylabel('Average gas (×10^3 units)')
    ax.set_title('Average gas per operation')
    ax.grid(axis='y', alpha=0.3)
    for idx, val in enumerate(grouped / 1000):
        ax.text(idx, val + 1, f"{val:.1f}", ha='center', va='bottom', fontsize=9)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / 'gas_bar.png', dpi=200)


def gas_pie(df):
    grouped = df.groupby('operation')['gas_used'].sum().sort_values(ascending=False)
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.pie(grouped, labels=grouped.index, autopct='%1.1f%%', startangle=140)
    ax.set_title('Total gas distribution by operation')
    fig.savefig(OUTPUT_DIR / 'gas_pie.png', dpi=200)


def txn_time_plot(df):
    fig, ax = plt.subplots(figsize=(8, 4.5))
    for operation, subset in df.groupby('operation'):
        ax.plot(
            subset['iteration'],
            subset['duration_ms'],
            marker='.',
            linestyle='',
            alpha=0.4,
            label=operation
        )

    ax.set_xlabel('Iteration')
    ax.set_ylabel('Transaction time (ms)')
    ax.set_title('Transaction time scatter by operation')
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / 'tx_time_scatter.png', dpi=200)


def cumulative_gas(df):
    running = df.sort_values('iteration')['gas_used'].cumsum()
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.plot(range(1, len(running) + 1), running / 1000, color='#4f6d7a')
    ax.set_xlabel('Transaction count')
    ax.set_ylabel('Cumulative gas (×10^3 units)')
    ax.set_title('Cumulative gas usage across test run')
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / 'gas_cumulative.png', dpi=200)


def main():
    df = load_data()
    avg_gas_bar(df)
    gas_pie(df)
    txn_time_plot(df)
    cumulative_gas(df)
    print(f"Charts saved to {OUTPUT_DIR}")


if __name__ == '__main__':
    main()

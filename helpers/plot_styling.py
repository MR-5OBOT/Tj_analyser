"""Modern plot styling utilities for consistent visualization aesthetics."""

import matplotlib.pyplot as plt
from matplotlib.axes import Axes
from matplotlib.figure import Figure

from config import COLORS, PLOT_STYLE


def apply_dark_style() -> None:
    """Apply the dark background style globally."""
    plt.style.use(PLOT_STYLE)


def style_axes(
    ax: Axes,
    title: str = "",
    xlabel: str = "",
    ylabel: str = "",
    rotation: int = 0,
    labelsize: int = 10,
) -> None:
    """
    Apply consistent modern styling to matplotlib axes.
    
    Args:
        ax: Matplotlib axes object
        title: Plot title
        xlabel: X-axis label
        ylabel: Y-axis label
        rotation: X-axis label rotation in degrees
        labelsize: Font size for tick labels
    """
    # Set labels and title
    if title:
        ax.set_title(title, color=COLORS["text"])
    ax.set_xlabel(xlabel, color=COLORS["text"])
    ax.set_ylabel(ylabel, color=COLORS["text"])
    
    # Configure tick parameters
    ax.tick_params(
        axis="x",
        rotation=rotation,
        labelsize=labelsize,
        colors=COLORS["text"]
    )
    ax.tick_params(
        axis="y",
        labelsize=labelsize,
        colors=COLORS["text"]
    )
    
    # Style spines (borders)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(COLORS["text"])
    ax.spines["bottom"].set_color(COLORS["text"])


def create_figure(figsize: tuple[int, int] = (8, 6)) -> tuple[Figure, Axes]:
    """
    Create a styled figure and axes with dark theme.
    
    Args:
        figsize: Figure size as (width, height)
        
    Returns:
        Tuple of (figure, axes)
    """
    apply_dark_style()
    fig, ax = plt.subplots(figsize=figsize)
    return fig, ax


def finalize_plot(fig: Figure) -> Figure:
    """
    Apply final touches to a plot before returning.
    
    Args:
        fig: Matplotlib figure object
        
    Returns:
        The same figure object with tight layout applied
    """
    fig.tight_layout()
    return fig

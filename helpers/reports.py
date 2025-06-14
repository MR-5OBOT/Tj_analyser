import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
import datetime


def export_pdf_report(figure_list, type="Report"):
    pdf_path = f"{datetime.datetime.now().strftime('%Y-%m-%d')}-{type}.pdf"
    with PdfPages(pdf_path) as pdf:
        plots = figure_list
        for func, args in plots:
            fig = func(*args)
            if fig is not None:
                pdf.savefig(fig)
            plt.close()
    return pdf_path

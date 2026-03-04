"""
SHAP explanation utilities.
"""
import shap
import matplotlib.pyplot as plt
import io
import base64
import numpy as np
from typing import List

def generate_shap_plot(shap_values: np.ndarray,
                       feature_names: List[str],
                       class_names: List[str],
                       idx: int = 0) -> str:
    """
    Generate a SHAP summary plot as base64 PNG.
    Args:
        shap_values: array of SHAP values for a single class.
        feature_names: list of feature names.
        class_names: list of class names (used for title).
        idx: which class (for title).
    Returns:
        base64 encoded PNG.
    """
    plt.figure()
    shap.summary_plot(shap_values, feature_names=feature_names, show=False)
    plt.title(f"SHAP for {class_names[idx]}")
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    plt.close()
    return base64.b64encode(buf.getvalue()).decode('utf-8')
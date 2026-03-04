 
import shap
import matplotlib.pyplot as plt
import io
import base64

def generate_shap_plot(shap_values, feature_names, class_names, idx=0):
    """
    Generate a SHAP summary plot as base64 PNG.
    shap_values: list of arrays (for each class)
    feature_names: list of symptom names
    class_names: list of disease names
    idx: which class to explain
    """
    plt.figure()
    shap.summary_plot(shap_values[idx], feature_names=feature_names, show=False)
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    plt.close()
    return base64.b64encode(buf.getvalue()).decode('utf-8')
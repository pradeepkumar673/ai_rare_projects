"""
Ensemble of Random Forest and XGBoost for symptom-based prediction.
"""
import joblib
import numpy as np
import pandas as pd
import shap
from typing import List, Tuple, Dict, Any, Optional

class StructuredPredictor:
    """
    Wrapper for Random Forest + XGBoost ensemble.
    """
    def __init__(self, rf_path: str, xgb_path: str, encoder_path: str, feature_names_path: str):
        self.rf = joblib.load(rf_path)
        self.xgb = joblib.load(xgb_path)
        self.le = joblib.load(encoder_path)
        self.feature_names: List[str] = joblib.load(feature_names_path)

    def _preprocess(self, symptoms_list: List[str], demographics: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        """
        Convert symptom list to binary vector aligned with feature_names.
        """
        data = {name: 0 for name in self.feature_names}
        for sym in symptoms_list:
            if sym in data:
                data[sym] = 1
        # Demographics could be added as features later
        df = pd.DataFrame([data])
        return df[self.feature_names]

    def predict_proba(self, symptoms_list: List[str], demographics: Optional[Dict[str, Any]] = None) -> np.ndarray:
        X = self._preprocess(symptoms_list, demographics)
        rf_proba = self.rf.predict_proba(X)[0]
        xgb_proba = self.xgb.predict_proba(X)[0]
        ensemble_proba = (rf_proba + xgb_proba) / 2
        return ensemble_proba

    def predict_top5(self, symptoms_list: List[str], demographics: Optional[Dict[str, Any]] = None) -> List[Tuple[str, float]]:
        proba = self.predict_proba(symptoms_list, demographics)
        top5_idx = np.argsort(proba)[-5:][::-1]
        top5_diseases = self.le.inverse_transform(top5_idx)
        top5_proba = proba[top5_idx]
        return list(zip(top5_diseases, top5_proba))

    def explain(self, symptoms_list: List[str], demographics: Optional[Dict[str, Any]] = None) -> Tuple[List[Tuple[str, float]], np.ndarray]:
        """
        Returns:
            top_10_features: list of (symptom, importance)
            shap_values_full: array of SHAP values for the predicted class
        """
        X = self._preprocess(symptoms_list, demographics)
        explainer = shap.TreeExplainer(self.rf)
        shap_values = explainer.shap_values(X)  # shape (n_classes, n_features) or (n_features,) depending on RF
        # shap_values for classification: list of arrays, one per class
        if isinstance(shap_values, list):
            proba = self.predict_proba(symptoms_list, demographics)
            pred_class = int(np.argmax(proba))
            shap_for_class = shap_values[pred_class][0]
        else:
            # Binary case: shap_values is 2D
            shap_for_class = shap_values[0]

        feature_imp = list(zip(self.feature_names, np.abs(shap_for_class)))
        feature_imp.sort(key=lambda x: x[1], reverse=True)
        return feature_imp[:10], shap_for_class
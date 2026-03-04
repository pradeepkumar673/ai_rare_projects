"""
Ensemble of Random Forest and XGBoost for symptom-based prediction.
"""
import joblib
import numpy as np
import pandas as pd
import shap
import types
from typing import List, Tuple, Dict, Any, Optional


def _patch_xgb_classifier(clf):
    """
    Monkey-patch get_params() on an XGBClassifier pickled with an older
    XGBoost that had `use_label_encoder`.
    """
    def safe_get_params(self, deep=True):
        out = {}
        for key in self._get_param_names():
            try:
                value = getattr(self, key)
            except AttributeError:
                continue
            if deep and hasattr(value, "get_params") and not isinstance(value, type):
                deep_items = value.get_params().items()
                out.update((key + "__" + k, val) for k, val in deep_items)
            out[key] = value
        return out

    clf.get_params = types.MethodType(safe_get_params, clf)
    return clf


def _extract_shap_1d(shap_values, pred_class: int) -> np.ndarray:
    """
    Normalise whatever shape SHAP returns into a flat 1-D array of
    per-feature importances (abs values), regardless of multiclass shape.

    SHAP TreeExplainer can return many shapes depending on sklearn version:

      list of arrays (one per class):
        each element: (n_samples, n_features)
        → shap_values[pred_class][0]   → shape (n_features,)

      3-D ndarray — TWO possible axis orderings:
        (n_samples, n_features, n_classes)  ← sklearn RF, newer SHAP
          → sv[0, :, pred_class]
        (n_classes, n_samples, n_features)  ← older SHAP
          → sv[pred_class, 0, :]

      2-D ndarray:
        (n_samples, n_features)  → sv[0]

      1-D ndarray:
        (n_features,)  → sv  (binary case)

    We detect the ordering by comparing axis sizes against the known number
    of features, which is always passed in as `n_features`.
    """
    if isinstance(shap_values, list):
        arr = np.asarray(shap_values[pred_class])
        return arr[0] if arr.ndim == 2 else arr.ravel()

    sv = np.asarray(shap_values)

    if sv.ndim == 3:
        n_samples, d1, d2 = sv.shape
        # Figure out which axis is n_features vs n_classes by process of
        # elimination: n_samples == 1 always (single-row prediction).
        # The larger of d1/d2 is almost always n_features; n_classes <= d1 or d2.
        # Safe approach: just average over the class axis (last or first of d1/d2)
        # after squeezing the sample axis.
        sv_squeezed = sv[0]          # → (d1, d2)
        # Use the mean across whichever axis is the class axis.
        # Heuristic: if d2 < d1, d2 is likely n_classes → mean over axis 1
        #            if d1 < d2, d1 is likely n_classes → mean over axis 0
        if d1 <= d2:
            # shape (n_classes, n_features) → pick pred_class row if in range,
            # else mean
            if pred_class < d1:
                return sv_squeezed[pred_class]
            return sv_squeezed.mean(axis=0)
        else:
            # shape (n_features, n_classes) → pick pred_class col if in range
            if pred_class < d2:
                return sv_squeezed[:, pred_class]
            return sv_squeezed.mean(axis=1)

    if sv.ndim == 2:
        return sv[0]

    return sv.ravel()


class StructuredPredictor:
    """
    Wrapper for Random Forest + XGBoost ensemble.
    """
    def __init__(self, rf_path: str, xgb_path: str, encoder_path: str, feature_names_path: str):
        self.rf = joblib.load(rf_path)
        self.xgb = joblib.load(xgb_path)
        self.le = joblib.load(encoder_path)
        self.feature_names: List[str] = joblib.load(feature_names_path)
        self.xgb = _patch_xgb_classifier(self.xgb)

    def _preprocess(self, symptoms_list: List[str], demographics: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        data = {name: 0 for name in self.feature_names}
        for sym in symptoms_list:
            if sym in data:
                data[sym] = 1
        df = pd.DataFrame([data])
        return df[self.feature_names]

    def predict_proba(self, symptoms_list: List[str], demographics: Optional[Dict[str, Any]] = None) -> np.ndarray:
        X = self._preprocess(symptoms_list, demographics)
        rf_proba = self.rf.predict_proba(X)[0]
        xgb_proba = self.xgb.predict_proba(X)[0]
        return (rf_proba + xgb_proba) / 2

    def predict_top5(self, symptoms_list: List[str], demographics: Optional[Dict[str, Any]] = None) -> List[Tuple[str, float]]:
        proba = self.predict_proba(symptoms_list, demographics)
        top5_idx = np.argsort(proba)[-5:][::-1]
        top5_diseases = self.le.inverse_transform(top5_idx)
        top5_proba = proba[top5_idx]
        return list(zip(top5_diseases, top5_proba))

    def explain(self, symptoms_list: List[str], demographics: Optional[Dict[str, Any]] = None) -> Tuple[List[Tuple[str, float]], np.ndarray]:
        X = self._preprocess(symptoms_list, demographics)

        explainer = shap.TreeExplainer(self.rf)
        shap_values = explainer.shap_values(X)

        proba = self.predict_proba(symptoms_list, demographics)
        pred_class = int(np.argmax(proba))

        shap_1d = _extract_shap_1d(shap_values, pred_class)

        # Convert to plain Python floats before sorting to avoid numpy bool ambiguity
        importances = [float(v) for v in np.abs(shap_1d)]
        feature_imp = list(zip(self.feature_names, importances))
        feature_imp.sort(key=lambda x: x[1], reverse=True)

        return feature_imp[:10], shap_1d
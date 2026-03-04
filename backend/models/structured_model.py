 
import joblib
import numpy as np
import pandas as pd
import shap

class StructuredPredictor:
    """
    Wrapper for Random Forest and XGBoost ensemble.
    Handles preprocessing, prediction, and SHAP explanations.
    """
    def __init__(self, rf_path, xgb_path, encoder_path, feature_names_path):
        self.rf = joblib.load(rf_path)
        self.xgb = joblib.load(xgb_path)
        self.le = joblib.load(encoder_path)
        self.feature_names = joblib.load(feature_names_path)

    def _preprocess(self, symptoms_list, demographics=None):
        """
        Convert list of symptom strings (e.g., ['fever', 'cough']) into a binary vector
        aligned with self.feature_names.
        demographics can be used later if needed.
        """
        # Start with a zero vector
        data = {name: 0 for name in self.feature_names}
        # Mark present symptoms
        for sym in symptoms_list:
            if sym in data:
                data[sym] = 1
        # If demographics are present, we would map them to features here
        # For now, assume only symptoms
        df = pd.DataFrame([data])
        return df[self.feature_names]  # ensure correct order

    def predict_proba(self, symptoms_list, demographics=None):
        X = self._preprocess(symptoms_list, demographics)
        rf_proba = self.rf.predict_proba(X)[0]
        xgb_proba = self.xgb.predict_proba(X)[0]
        ensemble_proba = (rf_proba + xgb_proba) / 2
        return ensemble_proba

    def predict_top5(self, symptoms_list, demographics=None):
        proba = self.predict_proba(symptoms_list, demographics)
        top5_idx = np.argsort(proba)[-5:][::-1]
        top5_diseases = self.le.inverse_transform(top5_idx)
        top5_proba = proba[top5_idx]
        return list(zip(top5_diseases, top5_proba))

    def explain(self, symptoms_list, demographics=None):
        """
        Return top‑10 most important symptoms for the predicted class.
        """
        X = self._preprocess(symptoms_list, demographics)
        # Use TreeExplainer on Random Forest (faster)
        explainer = shap.TreeExplainer(self.rf)
        shap_values = explainer.shap_values(X)
        # shap_values shape: (n_classes, n_features) for classification
        # Get the class with highest probability
        proba = self.predict_proba(symptoms_list, demographics)
        pred_class = np.argmax(proba)
        shap_for_class = shap_values[pred_class][0]  # shape (n_features,)
        # Pair feature names with absolute SHAP values, sort
        feature_imp = list(zip(self.feature_names, np.abs(shap_for_class)))
        feature_imp.sort(key=lambda x: x[1], reverse=True)
        return feature_imp[:10]   # return top 10
 
import numpy as np

class MultimodalFusion:
    """
    Weighted fusion of structured and image predictions.
    If both models agree strongly, flag as high confidence.
    """
    def __init__(self, structured_weight=0.7, image_weight=0.3, agreement_threshold=0.8):
        self.structured_weight = structured_weight
        self.image_weight = image_weight
        self.agreement_threshold = agreement_threshold

    def fuse(self, structured_proba, image_proba, structured_diseases, image_disease_map=None):
        """
        Args:
            structured_proba: array of probabilities for all structured diseases (size N)
            image_proba: array of probabilities for image classes (size M)
            structured_diseases: list of disease names (size N) in same order as structured_proba
            image_disease_map: dict mapping image class index to structured disease name (optional)
        Returns:
            fused_proba: array of same length as structured_proba
            agreement: 'high' if both models' top predictions match, else 'low'
        """
        if image_disease_map is not None:
            # Map image probabilities to structured disease indices
            mapped_image_proba = np.zeros_like(structured_proba)
            for img_idx, disease_name in image_disease_map.items():
                if disease_name in structured_diseases:
                    struct_idx = structured_diseases.index(disease_name)
                    mapped_image_proba[struct_idx] = image_proba[img_idx]
        else:
            # Assume both models output over same disease list (simpler)
            # We'll just use image_proba as is, but need to align lengths – for demo we skip
            # In real scenario, you'd have a mapping table.
            # For now, we'll just return structured_proba if no mapping.
            mapped_image_proba = np.zeros_like(structured_proba)

        fused = self.structured_weight * structured_proba + self.image_weight * mapped_image_proba

        # Determine agreement
        struct_top = structured_diseases[np.argmax(structured_proba)]
        if image_disease_map:
            img_top = image_disease_map[np.argmax(image_proba)]
        else:
            img_top = None
        agreement = 'high' if struct_top == img_top else 'low'

        return fused, agreement
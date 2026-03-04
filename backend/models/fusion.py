import numpy as np

class MultimodalFusion:
    # Map HAM10000 disease names to our structured disease names (choose the closest match)
    # If no match, map to 'unknown_skin' (which we assume exists in the structured set).
    IMAGE_TO_STRUCTURED_MAP = {
        'Melanoma': 'melanoma',
        'Nevus': 'nevus',
        'Basal Cell Carcinoma': 'basal cell carcinoma',
        'Actinic Keratosis': 'actinic keratosis',
        'Benign Keratosis': 'benign keratosis',
        'Dermatofibroma': 'dermatofibroma',
        'Vascular Lesion': 'vascular lesion'
    }
    # We'll assume 'unknown_skin' is added to the structured disease list.

    def __init__(self, structured_weight=0.7, image_weight=0.3, agreement_threshold=0.8):
        self.structured_weight = structured_weight
        self.image_weight = image_weight
        self.agreement_threshold = agreement_threshold

    def fuse(self, structured_proba, image_proba, structured_diseases, image_idx_to_name):
        """
        structured_proba: array (N,) of probabilities from structured model.
        image_proba: array (7,) of probabilities from image model.
        structured_diseases: list of N disease names in same order as structured_proba.
        image_idx_to_name: dict mapping image class index (0-6) to disease name.
        Returns:
            fused_proba: array (N,) fused probabilities.
            agreement: 'high' or 'low'.
        """
        # Build mapping from structured disease index to image probability
        mapped_image_proba = np.zeros_like(structured_proba)
        for img_idx, img_name in image_idx_to_name.items():
            mapped_name = self.IMAGE_TO_STRUCTURED_MAP.get(img_name, 'unknown_skin')
            if mapped_name in structured_diseases:
                struct_idx = structured_diseases.index(mapped_name)
                mapped_image_proba[struct_idx] = image_proba[img_idx]

        fused = self.structured_weight * structured_proba + self.image_weight * mapped_image_proba

        # Determine agreement
        struct_top = structured_diseases[np.argmax(structured_proba)]
        img_top_name = image_idx_to_name[np.argmax(image_proba)]
        mapped_top = self.IMAGE_TO_STRUCTURED_MAP.get(img_top_name, 'unknown_skin')
        agreement = 'high' if struct_top == mapped_top else 'low'

        return fused, agreement
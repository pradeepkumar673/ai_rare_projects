"""
Multimodal fusion of structured and image predictions.
"""
import numpy as np
from typing import List, Dict, Tuple

class MultimodalFusion:
    # Map HAM10000 disease names to our structured disease names.
    # If no match, map to 'unknown_skin' (should exist in structured set).
    IMAGE_TO_STRUCTURED_MAP: Dict[str, str] = {
        'Melanoma': 'melanoma',
        'Nevus': 'nevus',
        'Basal Cell Carcinoma': 'basal cell carcinoma',
        'Actinic Keratosis': 'actinic keratosis',
        'Benign Keratosis': 'benign keratosis',
        'Dermatofibroma': 'dermatofibroma',
        'Vascular Lesion': 'vascular lesion'
    }

    def __init__(self, structured_weight: float = 0.7, image_weight: float = 0.3) -> None:
        self.structured_weight = structured_weight
        self.image_weight = image_weight

    def fuse(self,
             structured_proba: np.ndarray,
             image_proba: np.ndarray,
             structured_diseases: List[str],
             image_idx_to_name: Dict[int, str]) -> Tuple[np.ndarray, str]:
        """
        Args:
            structured_proba: array (N,) of probabilities from structured model.
            image_proba: array (7,) of probabilities from image model.
            structured_diseases: list of N disease names in same order.
            image_idx_to_name: dict mapping image class index to disease name.
        Returns:
            fused_proba: array (N,) fused probabilities.
            agreement: 'high' if top predictions match after mapping, else 'low'.
        """
        # Build mapped image probability vector over structured diseases
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
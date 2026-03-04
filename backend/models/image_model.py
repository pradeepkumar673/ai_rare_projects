"""
EfficientNet-B3 image classifier with Grad-CAM.
"""
import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import timm
import numpy as np
import cv2
from typing import Tuple, Dict, Any

class ImagePredictor:
    """
    EfficientNet-B3 trained on HAM10000. Device auto-detected.
    """
    def __init__(self, model_path: str):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        # Load model architecture
        self.model = timm.create_model('efficientnet_b3', pretrained=False, num_classes=7)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225])
        ])

        self.idx_to_disease: Dict[int, str] = {
            0: 'Melanoma',
            1: 'Nevus',
            2: 'Basal Cell Carcinoma',
            3: 'Actinic Keratosis',
            4: 'Benign Keratosis',
            5: 'Dermatofibroma',
            6: 'Vascular Lesion'
        }

    def predict(self, image_bytes: bytes) -> Tuple[str, float, np.ndarray, np.ndarray]:
        """
        Args:
            image_bytes: raw image bytes (file content).
        Returns:
            disease: top predicted disease name.
            confidence: float probability.
            probabilities: array of length 7.
            heatmap: numpy array (224,224) for Grad-CAM.
        """
        img = Image.open(image_bytes).convert('RGB')
        input_tensor = self.transform(img).unsqueeze(0).to(self.device)

        with torch.no_grad():
            output = self.model(input_tensor)
            probs = F.softmax(output, dim=1).cpu().numpy()[0]

        top_idx = int(np.argmax(probs))
        disease = self.idx_to_disease[top_idx]
        confidence = float(probs[top_idx])

        heatmap = self._gradcam(input_tensor, top_idx)

        return disease, confidence, probs, heatmap

    def _gradcam(self, input_tensor: torch.Tensor, target_class: int) -> np.ndarray:
        """
        Generate Grad-CAM heatmap for the target class.
        """
        self.model.eval()
        features = []
        gradients = []

        def forward_hook(module, input, output):
            features.append(output)

        def backward_hook(module, grad_in, grad_out):
            gradients.append(grad_out[0])

        # For EfficientNet, last conv layer is 'conv_head'
        handle_forward = self.model.conv_head.register_forward_hook(forward_hook)
        handle_backward = self.model.conv_head.register_full_backward_hook(backward_hook)

        output = self.model(input_tensor)
        self.model.zero_grad()
        one_hot = torch.zeros_like(output)
        one_hot[0, target_class] = 1
        output.backward(gradient=one_hot, retain_graph=True)

        weights = torch.mean(gradients[0], dim=[2, 3], keepdim=True)
        cam = torch.sum(weights * features[0], dim=1, keepdim=True)
        cam = F.relu(cam)
        cam = cam.squeeze().cpu().detach().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        cam = cv2.resize(cam, (224, 224))

        handle_forward.remove()
        handle_backward.remove()
        return cam
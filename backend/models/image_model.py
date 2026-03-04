 
import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import timm
import numpy as np
import cv2

class ImagePredictor:
    """
    EfficientNet-B3 trained on HAM10000.
    Provides prediction and Grad‑CAM heatmap.
    """
    def __init__(self, model_path, device='cpu'):
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        # Load model architecture
        self.model = timm.create_model('efficientnet_b3', pretrained=False, num_classes=7)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()

        # Image transformation
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225])
        ])

        # Class mapping for HAM10000 (customize if needed)
        self.idx_to_disease = {
            0: 'Melanoma',
            1: 'Nevus',
            2: 'Basal Cell Carcinoma',
            3: 'Actinic Keratosis',
            4: 'Benign Keratosis',
            5: 'Dermatofibroma',
            6: 'Vascular Lesion'
        }

    def predict(self, image_bytes):
        """
        Args:
            image_bytes: file-like object or bytes
        Returns:
            disease: top predicted disease name
            confidence: float
            probabilities: array of length 7
            heatmap: numpy array (224,224) for Grad‑CAM
        """
        # Open image
        img = Image.open(image_bytes).convert('RGB')
        input_tensor = self.transform(img).unsqueeze(0).to(self.device)

        # Forward pass
        with torch.no_grad():
            output = self.model(input_tensor)
            probs = F.softmax(output, dim=1).cpu().numpy()[0]

        # Get top prediction
        top_idx = np.argmax(probs)
        disease = self.idx_to_disease[top_idx]
        confidence = probs[top_idx]

        # Generate Grad‑CAM (simplified – you may want a more robust implementation)
        heatmap = self._gradcam(input_tensor, top_idx)

        return disease, confidence, probs, heatmap

    def _gradcam(self, input_tensor, target_class):
        """
        Simple Grad‑CAM for EfficientNet.
        Hooks the last convolutional layer.
        """
        # Get the last convolutional layer (depends on model)
        # For efficientnet_b3, the last conv is 'conv_head'
        self.model.eval()
        features = []
        gradients = []

        def forward_hook(module, input, output):
            features.append(output)

        def backward_hook(module, grad_in, grad_out):
            gradients.append(grad_out[0])

        # Register hooks
        handle_forward = self.model.conv_head.register_forward_hook(forward_hook)
        handle_backward = self.model.conv_head.register_full_backward_hook(backward_hook)

        # Forward pass
        output = self.model(input_tensor)
        self.model.zero_grad()
        # One‑hot for target class
        one_hot = torch.zeros_like(output)
        one_hot[0, target_class] = 1
        output.backward(gradient=one_hot, retain_graph=True)

        # Get weights and feature maps
        weights = torch.mean(gradients[0], dim=[2, 3], keepdim=True)  # (1, C, 1, 1)
        cam = torch.sum(weights * features[0], dim=1, keepdim=True)   # (1, 1, H, W)
        cam = F.relu(cam)
        # Normalize and resize
        cam = cam.squeeze().cpu().detach().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        cam = cv2.resize(cam, (224, 224))

        # Remove hooks
        handle_forward.remove()
        handle_backward.remove()

        return cam
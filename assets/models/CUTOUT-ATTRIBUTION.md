# Background removal

U²-Net / U2NETP by Xuebin Qin et al. is used for salient object segmentation.
Project: https://github.com/xuebinqin/U-2-Net
Paper: https://arxiv.org/abs/2005.09007
License: Apache-2.0, included as U2NET-LICENSE.txt.
The unmodified u2netp.onnx export is distributed by rembg:
https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx
SHA-256: 309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8

ONNX Runtime Web 1.20.1 by Microsoft is used for browser inference.
Project: https://github.com/microsoft/onnxruntime
License: MIT, included at ../../scripts/vendor/onnx/LICENSE.
Runtime and model files are hosted on this site. User images are processed
in a dedicated browser worker and are not sent to a third-party inference API.

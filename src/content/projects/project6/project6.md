---
title: "PPE compliance monitoring"
description: "Live PPE compliance monitoring system deployed on Nvidia Jetson Orin edge devices across multiple cameras"
pubDate: "Jun 30 2026"
heroImage: "./media/hero_image.jpg"
tags: ["Python", "Computer Vision", "Object Detection", "Keypoint Detection", "Pose Estimation", "Edge AI", "Nvidia Jetson", "Deep Learning", "PPE Detection", "TensorRT", "YOLO", "Docker"]

---

A live computer vision system that monitors worker PPE compliance across multiple camera feeds, deployed on Nvidia Jetson Orin embedded computers using TensorRT-accelerated inference.

## Overview

An industrial manufacturing facility needed a live monitoring system to proactively enforce PPE safety rules and prevent accidents before they could occur. Workers were required to wear helmets, gloves, arm protectors, and particulate respirators depending on the area, and consistent enforcement across the entire floor was difficult to guarantee through manual supervision alone.

The system had to run entirely on-premises on embedded hardware, process multiple camera feeds simultaneously without human intervention, and produce evidence that supervisors could review after the fact.

## Approach

I built a Python-based multiprocessing pipeline where each RTSP camera stream runs in its own process, performing keypoint detection, PPE detection, and keypoint-anchored rule evaluation independently. When a violation is detected, the pipeline saves an annotated image snapshot with bounding boxes and labels, buffers recent frames, writes a short video clip around the event, and logs the violation type, timestamp, and camera location for later analysis.

### Person Keypoint Detection

Rather than a plain person detector, a keypoint detection model was used to locate anatomical landmarks on each visible worker (head, wrists, elbows, and other joints). These points of interest anchored the PPE checks to the correct body region: a helmet detection was validated against head keypoints, gloves against wrists, and arm protectors against the wrist–elbow segment. This spatial validation reduced false positives from PPE items detected in the frame but not actually worn by a worker. Per-worker crops for the downstream PPE model were derived from the bounding box of each worker's detected keypoints.

### PPE Detection Model

A YOLO-based model was trained to detect the presence or absence of each required PPE item on every visible worker: security helmets, gloves, arm protectors, and particulate respirators. The model was evaluated per detection class using precision, recall, and F1 metrics to identify weak spots before deployment.

### Edge Inference with TensorRT

All YOLO models were exported to TensorRT engine format with FP16 precision. The full pipeline uses Jetson hardware blocks end-to-end: RTSP streams are decoded by the hardware H.265 decoder (NVDEC) via a GStreamer pipeline, pixel format conversion is handled by the VIC (Video Image Compositor) block with `nvvidconv`, and output video clips are encoded by the hardware H.264 encoder (NVENC). This keeps the CPU and GPU free for inference rather than codec work.

### Containerized Deployment

The entire pipeline (model, runtime dependencies, and configuration) was packaged into a Docker container built for the Jetson Orin platform, making re-deployment and updates reproducible across devices.

## Results

- Multiple RTSP camera streams processed concurrently across Jetson Orin devices.
- Four PPE classes monitored per worker per frame.
- Per-class precision, recall, and F1 measured and used to guide data collection and retraining.
- Alert logs enabled supervisors to monitor compliance patterns by area and time of day.

## Technical Considerations

**GPU memory per process.** Each camera runs a tree of Python processes (ingestion → keypoint detection → PPE detection → event processing), and every subprocess that uses CUDA allocates its own CUDA context. Reducing the number of independent contexts is a clear opportunity to lower memory overhead and increase the number of concurrent streams the hardware can support.

**Dynamic batching for PPE inference.** The PPE model receives per-person crops rather than full frames, and the crop count per frame varies with how many workers are visible. Crops are collected per frame, chunked into fixed-size batches, and sent as a single inference call to keep the GPU utilized.

## Further Improvements

The custom multiprocessing architecture met the deployment requirements, with clear opportunities to optimize memory usage and inference throughput further. NVIDIA DeepStream is worth exploring as an alternative that addresses several of these at the framework level.

**CUDA context overhead** could be reduced because DeepStream runs all streams inside a single GStreamer process, which generally means fewer independent GPU contexts than a one-process-per-camera design.

**Multi-stream batching** is handled natively by the `nvstreammux` plugin, which aggregates frames from multiple RTSP sources into a batched buffer and feeds it to `nvinfer` (the TensorRT inference plugin). Batch size is configured once and the muxer fills it automatically.

Beyond those, DeepStream provides capabilities that would otherwise require a custom implementation:

- **Zero-copy buffer sharing** between pipeline stages, reducing CPU round-trips between decode, inference, and encode.
- **Multi-object tracking** via `nvtracker`, with configurable high-performance tracking algorithms (NvDCF, NvSORT, NvDeepSORT) running on GPU.
- **On-screen display** via `nvdsosd`, which can draw bounding boxes and labels in GPU process mode without pulling frames to CPU.

## Conclusion

The system gave the facility a reliable, evidence-backed way to continuously enforce PPE rules across the entire floor, complementing manual supervision with automated monitoring.

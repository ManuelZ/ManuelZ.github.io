---
title: "Training DeepLabV3 with Automatic Mixed Precision"
description: "How Automatic Mixed Precision reduced memory consumption and enabled training DeepLabV3 for semantic segmentation on a 16GB GPU."
pubDate: "Jul 06 2026"
heroImage: "./media/hero_image.png"
tags: ["PyTorch", "AMP", "Deep Learning", "Semantic Segmentation"]
---

## Introduction

DeepLabV3 is a semantic segmentation model, and with a ResNet-101 backbone it's memory-hungry to train.

The biggest advantage of using Automatic Mixed Precision (AMP) was the drastic reduction in memory consumption. Without AMP, training DeepLabV3 with the ResNet-101 backbone on 720×1280 RGB images ran out of memory after the first epoch. With AMP, the model could be trained on a GPU with 16GB of VRAM using a batch size of 2.

Training with a batch size of 1 wasn't possible because the Batch Normalization layers in the ResNet-101 backbone need multiple images in the minibatch to compute the running mean and standard deviation.

## Hardware & Training Setup

- **GPU:** RTX 4060 Ti (136 Tensor Cores, Ada Lovelace architecture)
- **CUDA Version:** 12.6
- **Batch Size:** 2
- **Optimizer:** SGD (no momentum)
- **Image Size:** 720×1280 (HxW), RGB

## Tensor Cores across NVIDIA architectures

The importance of the architecture resides in the availability of Tensor Cores, which are required to obtain a boost in speed. Over the years, NVIDIA has progressively introduced and improved Tensor Cores across different architectures. Here's a timeline of their evolution:

- **2014 — Maxwell:** No Tensor Cores — Jetson Nano
- **2016 — Pascal:** No Tensor Cores — P100
- **2017 — Volta (Datacenters):** 1st Gen Tensor Cores — V100
- **2018 — Turing (Consumer):** 2nd Gen Tensor Cores — T4, GeForce 20 Series
- **2020 — Ampere (Consumer & Datacenters):** 3rd Gen Tensor Cores — GeForce 30 Series (Consumer), A100 (Datacenters)
- **2022 — Ada (Consumer):** 4th Gen Tensor Cores — GeForce 40 Series
- **2022 — Hopper (Datacenters):** 4th Gen Tensor Cores — H100
- **2025 — Blackwell:** 5th Gen Tensor Cores — GeForce 50 Series

## Experiments on the RTX 4060 Ti

Memory measurements were taken with:

```python
print("{:.0f} MiB allocated".format(torch.cuda.memory_allocated() / 1024**2))
```

### Experiment 1: with AMP

*Steady-state epoch:*

| Stage | Memory Allocated (MiB) |
|---|---|
| Before forward pass | 597 |
| After forward pass | 7393 |
| After loss calculation | 7562 |
| Before backward pass | 7731 |
| After backward pass | 831 |

- Iteration speed: **1.37 s/it**
- Epoch length: **23:55**

### Experiment 2: without AMP

*First epoch:*

| Stage | Memory Allocated (MiB) |
|---|---|
| Before forward pass | 271 |
| After forward pass | 13439 |
| After loss calculation | 13692 |
| Before backward pass | 13945 |
| After backward pass | 775 |

*Second epoch:*

| Stage | Memory Allocated (MiB) |
|---|---|
| Before forward pass | 640 |
| After forward pass | 13713 |
| After loss calculation | 13882 |
| Before backward pass | 14051 |

- Iteration speed: **3.38 s/it**
- Epoch length: **59:10**

The second epoch crashed with:

```
CUDA out of memory. Tried to allocate 1014.00 MiB. GPU 0 has a total capacity
of 15.60 GiB of which 73.06 MiB is free. Process 302189 has 15.52 GiB memory
in use. Of the allocated memory 13.55 GiB is allocated by PyTorch, and
1.82 GiB is reserved by PyTorch but unallocated.
```



## Experiments on a P100 (no Tensor Cores)

Tensor Cores are required to obtain a boost in speed, so the same experiment ran on a P100 (Pascal architecture, no Tensor Cores). To avoid an OOM when running without AMP, the images were first rescaled to 576x1024 (HxW).

### Experiment 3: without AMP

| Stage | Memory Allocated (MiB) |
|---|---|
| Before forward pass | 500 |
| After forward pass | 8863 |
| After loss calculation | 8971 |
| Before backward pass | 9079 |
| After backward pass | 740 |

- Iteration speed: **2.48 s/it**
- Epoch length: **43:18**

### Experiment 4: with AMP

| Stage | Memory Allocated (MiB) |
|---|---|
| Before forward pass | 474 |
| After forward pass | 4871 |
| After loss calculation | 4979 |
| Before backward pass | 5087 |
| After backward pass | 710 |

- Iteration speed: **2.60 s/it**
- Epoch length: **45:28**

On the P100, AMP still halved the memory footprint but did not speed up training. As expected, since there are no Tensor Cores to accelerate the reduced-precision operations.

## Conclusions

- AMP roughly halved activation memory (from ~13.6 GiB to ~7.5 GiB after the forward pass on the RTX 4060 Ti), which was the difference between OOM and a stable training with a batch size of 2 on 16GB of VRAM.
- Achieving a speedup requires a GPU with Tensor Cores: on the Ada-based RTX 4060 Ti, AMP cut epoch time from 59:10 to 23:55, while on the Pascal-based P100 it made no difference.

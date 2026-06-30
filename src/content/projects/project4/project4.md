---
title: "SORT Tracker"
description: "Python implementation of the SORT tracking algorithm"
pubDate: "Jun 30 2026"
heroImage: "./media/hero_image.png"
tags: ["Python", "OpenCV", "YOLOv11", "Kalman Filter", "Computer Vision", "Tracking"]
---

An implementation of the SORT (Simple Online and Realtime Tracking) algorithm using a custom Kalman Filter for predicting object positions frame-to-frame. Detections are provided by YOLOv11, and tracked objects are updated by associating Kalman Filter predictions with new observations using the Hungarian algorithm.

- *Get the code: [SORT Tracker](https://github.com/ManuelZ/sort-tracker)*
- *Kalman Filter implementation: [Kalman Filter](https://github.com/ManuelZ/Kalman-Filter)*

<div style="text-align: center;">

<video style="max-width: 100%; height: auto;" controls>
  <source src="https://github.com/user-attachments/assets/e3cb5306-74a7-4d91-9893-121f2385e023" type="video/mp4">
</video>

</div>

## Overview

Multi-object tracking (MOT) is the problem of following multiple objects across video frames, even when they temporarily disappear or overlap. When SORT was published at ICIP 2016, it ran at 260 Hz, over 20x faster than other state-of-the-art trackers at the time, while maintaining comparable accuracy. That speed came from a minimal design: just a Kalman Filter and the Hungarian algorithm applied to bounding box geometry.

This makes it fast and practical, at the cost of losing tracks during long occlusions.

SORT's design became the foundation for most modern trackers. The core loop, predict, associate, update, remains mostly the same across all of them.

- **ByteTrack** keeps SORT's IoU-only association but stops discarding low-confidence detections. Instead, it uses them in a second matching pass, recovering occluded objects that SORT would have dropped.
- **DeepSORT** adds a deep appearance descriptor (CNN embeddings) for re-identification, replaces pure IoU matching with a combination of Mahalanobis distance for motion gating and cosine distance for appearance similarity, and introduces a cascade matching strategy that prioritizes recently seen tracks, making it far more robust to occlusions and re-entries.
- **BoT-SORT** builds on DeepSORT's appearance features and adds camera motion compensation, correcting Kalman Filter predictions when the camera itself is moving rather than only the objects.

## Approach

The pipeline runs frame by frame:

1. **Detect** — YOLOv11 produces bounding boxes for each frame.
2. **Predict** — each active tracker uses a Kalman Filter to estimate where its object will be in the current frame.
3. **Associate** — the Hungarian algorithm matches predictions to detections using an IoU cost matrix.
4. **Update** — matched trackers correct their state with the new detection; unmatched detections spawn new trackers; trackers with no match for too long are dropped.

### Kalman Filter

Each tracked object maintains its own Kalman Filter instance. The state vector encodes the bounding box center, scale, and aspect ratio, along with velocities for the center and scale. The aspect ratio is treated as constant and has no velocity term. The filter predicts forward each frame and is corrected whenever a matching detection is found. When no matching detection is found, the filter continues predicting, keeping the track alive through occlusions and transient detector failures.

### Hungarian Algorithm

Association is framed as a linear assignment problem. An IoU matrix is built between all current predictions and all current detections, and the Hungarian algorithm finds the globally optimal matching that maximizes overlap. Pairs below an IoU threshold are rejected to avoid linking predictions to unrelated detections.

### Track Lifecycle

Trackers are not shown immediately when created. A track must accumulate a minimum number of total updates before it is considered confirmed, which filters out spurious detections. Tracks that go unmatched beyond a maximum age threshold are deleted.


## References

[1] A. Bewley, Z. Ge, L. Ott, F. Ramos, and B. Upcroft, “Simple Online and Realtime Tracking,” in 2016 IEEE International Conference on Image Processing (ICIP), Sep. 2016, pp. 3464–3468. doi: 10.1109/ICIP.2016.7533003. Available: http://arxiv.org/abs/1602.00763. [Accessed: Jun. 30, 2026]

[2] A. Bewley, "sort.py," *abewley/sort*, GitHub. [Online]. Available: https://github.com/abewley/sort/blob/master/sort.py. [Accessed: Jun. 30, 2026].

[3] M. Gevorgyan, A. Mamikonyan, and M. Beyeler, OpenCV 4 with python blueprints: build creative computer vision projects with the latest version of OpenCV 4 and python 3, second edition, 2nd ed. Place of publication not identified: Packt Publishing, 2020.


---
title: "SORT Tracker"
description: "Python implementation of the SORT tracking algorithm"
pubDate: "Jun 30 2026"
heroImage: "./media/hero_image.png"
tags: ["Python", "OpenCV", "YOLOv11", "Kalman Filter", "Computer Vision", "Tracking"]
---

An implementation of the SORT tracking algorithm using a custom Kalman Filter for prediction of objects' positions. Detections are provided by YOLOv11 and tracked objects are updated by associating predictions with new observations using the Hungarian algorithm.

The multi-object tracking system monitors multiple objects (e.g., vehicles) within video sequences.
A Kalman Filter is employed to estimate an object's position, even when the object is not detected in a given frame.
The Hungarian Algorithm constructs a cost matrix (often based on IoU) to optimally match new detections with predictions. If no satisfactory match is found, a new tracker is initiated.
Bounding boxes are annotated with identification numbers for verification of the tracking process.


<div style="text-align: center;">

<video style="max-width: 100%; height: auto;" controls>
  <source src="https://github.com/user-attachments/assets/e3cb5306-74a7-4d91-9893-121f2385e023" type="video/mp4">
</video>

</div>

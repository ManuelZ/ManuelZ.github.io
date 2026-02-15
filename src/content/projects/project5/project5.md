---
title: "Building a Visual Odometry Pipeline with Python and OpenCV"
description: "Monocular visual odometry, the front end of a SLAM system, estimating camera motion and 3D structure from a single camera. Backend components like loop closure and global optimization are not covered here."
pubDate: "Feb 15 2026"
heroImage: "./media/vo-demo.jpg"
tags: ["Python", "OpenCV", "Open3D", "Computer Vision"]
---

*Monocular visual odometry, the front end of a SLAM system, estimating camera motion and 3D structure from a single camera. Backend components like loop closure and global optimization are not covered here.*

<div style="text-align: center;">

[![Demo](https://img.youtube.com/vi/QXuMJuNvdR4/0.jpg)](https://youtu.be/QXuMJuNvdR4)

*Click to watch the demo video*

</div>


## Introduction
This project is a monocular Visual SLAM pipeline built in Python with OpenCV, it takes single-camera video frames from the KITTI odometry benchmark and estimates the camera's 3D trajectory while reconstructing a sparse, color-sampled point cloud of the environment, all visualized with Open3D with a ground truth comparison of the pose.

## Content

### Visual Odometry from a single camera
Visual odometry estimates the camera's 3D rotation and translation between consecutive frames by tracking feature points across images and recovering the geometric relationship that explains their apparent motion.
With a single camera, depth is ambiguous, so translation can only be recovered up to an unknown scale factor. 
### Pipeline summary
-	KITTI Frame read
-	Resize frame, grayscale, rescale K
-	ORB / SIFT / keypoints + descriptors
-	Match points against previous frame
-	Essential matrix estimation using RANSAC
-	Essential matrix decomposition: R,t
-	Pose accumulation
-	3D reconstruction from projection matrices
-	Reproject world pts -> cam0 -> cam2 -> sample RGB
-	Push to Open3D viewer
### Feature detection and matching
The pipeline supports multiple detectors:
-	**ORB**: Fast binary descriptor, matched with Hamming distance.
-	**SIFT**: Scale-invariant float descriptor, matched with L2 distance.
The matcher auto-selects the appropriate algorithm based on descriptor type: FLANN uses LSH (Locality Sensitive Hashing) for binary descriptors like ORB, and KDTree for float descriptors like SIFT.
For filtering bad matches, the pipeline supports two strategies:
-	**Lowe's ratio test** discards any match where the nearest neighbor isn't significantly closer than the second-nearest, effective, but the threshold is heuristic, and an aggressive setting can reject correct matches [4]. 
-	**Cross-check matching**, where a match is only accepted if both descriptors agree they're each other's best match. 
In practice, it may be better to skip aggressive pre-filtering entirely and let RANSAC handle the outliers during essential matrix estimation, since RANSAC is designed for exactly this kind of noisy data [4].

### Essential Matrix estimation
This is the core geometric computation. Given matched point pairs `(x₁, x₂)` across two frames, the Essential Matrix `E` encodes the rotation and translation between the camera views through the epipolar constraint:

x₂ᵀ E x₁ = 0

The matrix is estimated using the 5-point algorithm with USAC_MAGSAC RANSAC, a modern robust estimator that outperforms classic RANSAC on contaminated data [6]. A valid essential matrix must have singular values of the form `[σ, σ, 0]`. When this constraint is violated, which happens in practice due to noise, the code corrects `E` by decomposing it with SVD, averaging the first two singular values, zeroing the third, and reconstructing. This is a direct implementation of the approach described in [2].

### Essential matrix decomposition
The essential matrix encodes the relative rotation and translation between two camera views. OpenCV decomposes it to recover the camera's motion, automatically selecting the physically valid solution. Reconstructed points must appear in front of both cameras, not behind them. Translation is recovered only up to scale, meaning we know the direction the camera moved but not by how much. This is the fundamental limitation of monocular SLAM.


### Degenerate case: pure rotation
When the camera undergoes pure rotation with no translation, the essential matrix collapses to the zero matrix. No epipolar geometry exists and triangulation is impossible.
ORB-SLAM3 handles this degeneracy through model selection. It estimates both a homography H and a fundamental matrix F in parallel, then evaluates each model using a score based on the reprojection error in both images. The system recovers the pose (R,t) from the model that explains the feature correspondence better (i.e., the one that yields the higher score).
In contrast, this pipeline takes a simpler approach: it detects pure rotation by checking whether the inlier count after the chirality check falls below a minimum threshold. When this occurs, it returns an identity rotation and a zero translation vector, indicating that the pose is unchanged, since reliable recovery from a degenerate essential matrix is not possible.

### Pose accumulation
Relative transforms are accumulated via post-multiplication:
```
curr_pose = curr_pose @ T_1_2  # SE(3) composition
```
Why post-multiplication? There are two ways to think about it:
-	**Change of reference frame**: Using the notation `T_A_B` to mean "frame B expressed in frame A", the composition reads: `pose_S_C2 = pose_S_C1 @ T_C1_C2`. Using the subscript cancellation rule from [1], the inner subscripts (`C1`) cancel, leaving the pose of camera 2 in the world frame `S`. 
-	**Displacement interpretation**: Pre-multiplying a frame (curr_pose) by a transform applies the rotation and translation in the frame in which the pose is expressed (world). Post-multiplying applies it in the body (camera) frame. `T_1_2` represents the camera's relative motion expressed in the camera frame, so post-multiplication is the correct choice.
The code verifies that the composition is a valid SE(3) transformation at every iteration and normalizes if numerical drift is detected.

### Triangulation and filtering
OpenCV handles the triangulation. 3D points are reconstructed from inlier correspondences using projection matrices, and then filtered in three stages:
1.	**RANSAC inliers**, points that satisfied the epipolar constraint during essential matrix estimation.
2.	**Chirality check**, the Z-coordinate in each camera frame must be positive (point is in front of the camera, not behind it).
3.	**Parallax filtering**, the angle between rays from each camera center to a 3D point must exceed a threshold (0.8 degrees). Small parallax means nearly-parallel rays, which produce noisy depth estimates.

### Color sampling across cameras
The pipeline runs on KITTI's cam0 because the pipeline needs grayscale input, but samples point colors from cam2. Since these are physically separate cameras with a known relative pose, coloring a triangulated 3D point is a reprojection problem: transform the point into cam2's frame, then project it to pixel coordinates to get the corresponding color.

### Visualization
The Open3D viewer uses a multithreaded architecture: SLAM runs on a background daemon thread, while the GUI event loop stays on the main thread (an OS requirement). Communication happens via `app.post_to_main_thread()` for thread-safe scene updates. The viewer shows the estimated trajectory (blue) alongside KITTI ground truth (green), with interactive controls for camera navigation, point size adjustment, and pause/resume.


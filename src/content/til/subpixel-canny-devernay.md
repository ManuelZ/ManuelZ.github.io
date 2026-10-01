---
title: "Sub-pixel Canny edges lose accuracy on angled edges"
description: "Devernay's sub-pixel edge refinement loses accuracy on angled edges, and a small modification improves it."
pubDate: "Oct 01 2026"
tags: ["Computer Vision", "Edge Detection"]
---

Canny finds edges only to the nearest pixel. Devernay's refinement goes further and cheaply estimates where the edge really sits between pixels. [1] shows that this refinement loses accuracy on edges that run at an angle across the image, sometimes drawing a visible zigzag along diagonals. A modification is proposed to improve the sub-pixel accuracy.


### References

[1] R. Grompone Von Gioi and G. Randall, “A Sub-Pixel Edge Detector: an Implementation of the Canny/Devernay Algorithm,” Image Processing On Line, vol. 7, pp. 347–372, Nov. 2017, doi: 10.5201/ipol.2017.216.

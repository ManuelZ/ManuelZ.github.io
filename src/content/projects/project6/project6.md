---
title: "PPE compliance monitoring "
description: "PPE compliance monitoring system deployed on Nvidia Jetson Orin edge devices, detecting missing Personal Protective Equipment (PPE)"
pubDate: "Jun 30 2026"
heroImage: "./media/hero_image.jpg"
tags: ["Python", "Computer Vision", "Object Detection", "Edge AI", "Nvidia Jetson", "Deep Learning", "PPE Detection"]

---

To help prevent workplace accidents, a steel rod handling facility needed a live monitoring system to detect when workers were not wearing required protective equipment. I built and deployed a computer vision system on two Nvidia Jetson Orin embedded computers using seven cameras. The system checked for security helmets, gloves, arm protectors, and particulate respirators.

The system logged the most common PPE omissions, including timestamp, location coordinates, equipment type, annotated images and video, allowing analysis of omission frequency by area and time.
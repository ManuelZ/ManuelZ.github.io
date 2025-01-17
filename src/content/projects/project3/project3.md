---
title: "TV Remote Automation"
description: "Automation of TV remote controls to assist older adults with button visibility and navigation."
pubDate: "Nov 20 2024"
heroImage: "./media/project3-1.jpg"
tags: ["Python", "OpenCV", "YOLOv8", "Deep Learning"]
---


A practical application of computer vision to improve TV remote usability for older adults. Using Deep learning for object detection, the solution provides feedback on the current state of a TV. The model was tested using an edge device, the JeVois-A33 smart machine camera, which runs a fine-tuned YOLOv8 ONNX model to detect and interpret one TV interface in a controlled environment, aiming to provide a more intuitive and accessible user experience.

### Introduction

Older adults may find some TV remotes challenging to use due to their lack of texture and color cues. 
For example, some might know how to change TV channels but struggle to switch between apps, such as from Netflix to 
regular television. This is how a TV remote could look like:

![Remote](media/project3-2.png)

The specific issues could be:

- Identifying the buttons that allow for specific actions (e.g., opening the apps menu)
- Pressing the correct buttons (left, right, enter, etc.) to select a different app
- Determining which app is currently in use by looking at the TV and understanding the contents
- All of this at night, with low light conditions

I'll explore a solution to these problems by:

- Using computer vision to provide feedback on the current TV state
- Using a microcontroller to send IR signals to the TV (coming soon...)

I have at hand a [JeVois-A33 "Smart Machine Vision Camera"](https://www.jevoisinc.com/products/jevois-a33-smart-machine-vision-camera) with the following high level specs:

- Processor: Quad-core ARM Cortex A7 @ 1.34GHz
- Memory: 256MB DDR3 SDRAM
- Camera: 1.3MP with various resolutions
- Storage: micro SD slot.
- USB: Mini USB for power, video streaming, and serial interface.
- Serial Port: Micro serial port for communication with controllers.


![Jevois](media/project3-3.jpeg)

I started with a VGA (640 x 480) resolution as a baseline for my experiments. In the future, I could select up SXGA 
(1280 x 1024) to capture more details or use lower resolutions if needed. 

Here's an example of an image captured at night with low light conditions:

![capture_example.png](media/capture_example.png)

This image shows a Smart TV with the applications bar open at the bottom of the screen. It displays 9 applications: 
YouTube, Television, Netflix, Max, Internet, Prime, Television over Internet, a TV provider application 
and Spotify. To the left of these apps are additional icons with native TV functions, which are outside the scope of 
this experiment.

### Approaches to solve the problem

I considered these approaches:

1) Classify the entire image.
2) Use an object detector to locate the apps bar and then apply classical computer vision techniques to identify the 
selected app.
3) Use an object detector to locate the apps bar and classify the selected app from the cropped bar image.

### Early results

1) Classification of the entire image with YOLOv8 nano was ineffective.
2) YOLOv8 nano for detecting the apps bar, combined with classical techniques for identifying the selected app showed 
promising results, but encountered corner cases and growing complexity.
3) Object detection of TV apps followed by classification was inefficient in terms of computing time.

It seemed that continuing to improve solution #2 was the only way. However, I realized that object detection 
simultaneously handles both classification and detection. I had been using a single class, "TV apps," but I could also
use multiple classes—specifically, 9 different classes. So there is a 4th possible solution:

4) Object detection to simultaneously detect the TV apps bar and classify it into one of 9 different classes. 

This is what the end result looks like:

<video width="1920" height="1080" controls>
 <source src="https://github.com/user-attachments/assets/aff52a3f-d1c6-4c33-8085-f6118e5dfaa2" type="video/webm">
</video>

The JeVois is connected to a laptop via USB. On the laptop, I receive the JeVois video feed using OBS Studio. All 
computer vision processing occurs on the JeVois at 1.7 FPS, with the laptop used solely for visualizing the results.

## The full object detection solution

The JeVois-A33 image comes with pre-installed and updated computer vision software, making it very easy to run code 
without the hassle of installing additional libraries. It also includes numerous computer vision examples that showcase 
its capabilities.

I’ve used YoloV5 before and liked its CLI for easy training, so I decided to try YOLOv8 for this experiment. I was 
particularly interested in its pre-trained models of different sizes and wanted to see if the smallest one (nano) would 
work with the JeVois.

Among the options to run deep learning models on the JeVois, loading an ONNX model using the OpenCV DNN module seemed 
straightforward, so I chose this approach. Although I was also interested in running TFLite models, I couldn’t quickly 
determine how to make a TFLite 2 model run on the JeVois.

These are the high level steps needed to deploy a Deep Learning object detector on the JeVois:
- Capture images
  - Capture and save images to the JeVois microSD
  - Move the images to a folder on my computer
  - Resize the images
- Annotate images:
  - Upload images to an annotation service 
  - Draw bounding boxes and assign a class to them
  - Download the annotations in the YOLO format for object detection
- Train an object detection model
- Convert the model to the ONNX format
- Load the model using the OpenCV DNN module

First, I’ll discuss the annotation software. Then, I’ll revisit the logistics of capturing images and the process of 
adding new data to the dataset.

## Using CVAT for annotating images

I explored some annotation applications like Label Studio, Roboflow and CVAT, among others. I settled on using CVAT on
my local machine due to the tons of features that it offers, how polished it is and the possibility of setting up my own
inference service to help me with further annotations down the road.

Running CVAT locally consists of cloning the repo and spawning the needed services with Docker Compose:
```
git clone git@github.com:cvat-ai/cvat.git
cd cvat
docker compose up -d
```

This is how the CVAT interface looks like:
![cvat_manual_annotation.png](media/cvat_manual_annotation.png)

## Training an object detection model 

Training the first model is really straightforward thanks to the YOLO training script. Instead of creating a custom 
training loop like when using raw Pytorch, it provides all the logic which includes:
- Good set of default hyperparameters
- Automatic optimizer definition: 
  - optimizer to use (SGD or AdamW when the optimizer is set to "auto")
  - initial learning rate
  - Momentum
  - definition of parameter groups with or without weight decay
  - weight decay value
- Usage of a learning rate scheduler 
- Augmentations including the new Mosaic augmentation
- Automatic handling of image sizes by resizing and letterbox padding
- Automatic selection of the optimum batch size for the available hardware

There are many features, but these are the ones that I paid attention to when inspecting the
[training code](https://github.com/ultralytics/ultralytics/blob/main/ultralytics/engine/trainer.py).

## Improving the model

Using YOLOv8 made the training extremely easy, but to further improve the model, I needed to collect more data, as I 
only had some couple hundred images and unbalanced classes. 

After trial and error, my workflow ended looking like this:

1) Capture and save images to the JeVois microSD at 480x640 size (HxW)
2) Move the images to a new folder on my computer named "Originals\BatchN"
3) Renaming them to "batchN_0000000i.png"
4) Splitting them into two different folders corresponding to train and validation subsets
5) Center-cropping to a 480x480 size, resizing to 256x256 and writing them in the corresponding Yolo folders 
`images\train`, `images\val`.
6) Uploading them to my local CVAT server as two different train and validation tasks 
7) Use my previously trained model to do automatic annotation on both subsets
8) Fix the wrong annotations
9) Download the YOLO annotations as .txt files, each named to match its corresponding image, with one line per bounding 
box, where the first number corresponds to the class of the identified object:
```
0 0.485918 0.573184 0.535430 0.131523
```
10) Re-train the object detection model using the YOLO Python module 
11) Convert the model to the ONNX format by calling the `.export` method of the created YOLO object
12) Re-create the Nuclio base image to include the new model
13) Re-create the Nuclio service so that the new image gets loaded

The non-trivial point here is #7 (alongside points 9-13), automatic annotation, which involves creating a Docker image for a prediction 
serverless service using Nuclio. This functionality is available out of the box with CVAT.

- For points #3, #4 and #5 I used custom scripts that helped me keep my data organized.

## Data organization 

YOLOv8 requires that images and annotation files for object detection be organized into separate folders for training, 
validation, and testing subsets. Adding data to these folders incrementally (e.g., a few hundred new images each day) 
is straightforward, but it can be prone to errors without proper organization.

The organization of data involves the following key points:
- I want to keep the original images separated by batch (e.g. images collected on day 1, images collected on day 2, etc.)
- I intend to use the same model for automatic annotation and inference. I suspect that a model trained on 256x256 
images may perform poorly on images of their original 480x640 size, so I need to resize the images to 256x256 and move 
them to the YOLO folder.
- To avoid name conflicts when organizing images, I rename them to `batchN_0000000i.png` before placing them 
in a folder named `originals\batchN`, where `batchN` represents a set of images collected during certain period of time.
This prevents issues when multiple images with the same name are collected over several days and when downloading the 
labels from CVAT, because it doesn't allow the image names to be changed after upload.
- CVAT requires data to be split into train, validation, and test subsets at the time of upload, and this division 
cannot be changed later. This is why I split them (randomly) into these subsets beforehand.

### About resizing images
YOLOv8 can automatically resize input images and annotations to match the desired target size.
The training scheme of YOLOv8 uses square images during the training and validation steps.
This can be seen [here](https://github.com/ultralytics/ultralytics/blob/54a0494e2d2b61b73e5f583eed97b2e9dfa48919/ultralytics/engine/trainer.py#L275C9-L275C24),
where the image size is forced to be a single number that's used for both the target height and width. This target image
size [must be a multiple](https://github.com/ultralytics/ultralytics/blob/54a0494e2d2b61b73e5f583eed97b2e9dfa48919/ultralytics/utils/checks.py#L162)
of the maximum model stride, which usually is 32. 

If the original images are not square, YOLOv8 can resize them by either:
  - Stretching the image regardless of its aspect ratio to fit into a square [as seen here](https://github.com/ultralytics/ultralytics/blob/1523fa12d801df237a76a4ac1cdf59823e16a994/ultralytics/data/base.py#L166), or
  - Maintaining the aspect ratio (as seen [here](https://github.com/ultralytics/ultralytics/blob/1523fa12d801df237a76a4ac1cdf59823e16a994/ultralytics/data/base.py#L161)) and applying letterbox padding to get a square (as seen [here](https://github.com/ultralytics/ultralytics/blob/1523fa12d801df237a76a4ac1cdf59823e16a994/ultralytics/data/dataset.py#L182)
and [here](https://github.com/ultralytics/ultralytics/blob/1523fa12d801df237a76a4ac1cdf59823e16a994/ultralytics/data/augment.py#L2295)) 

If I let YOLOv8 resize my 480x640 images with a target size of 256 while preserving the aspect ratio, it will convert them
to 192x256 and then apply letterbox padding. Instead, I use center cropping followed by resizing to 256x256. This 
approach ensures that the television, which is expected to be centered, remains in a slightly larger image, preserving 
more details compared to the 192x256 version.

## Improving Deep Learning results

- While correcting automatic annotations, I noticed confusion between two apps. Both apps had similar colors, which could 
have contributed to the confusion. When I verified my previous manual annotations, I discovered one image with two 
overlapping boxes, each representing one of those classes, and another image where the annotation for app 1 was 
mistakenly labeled as app 2.

- During app transitions, icon sizes change, and I sometimes capture images of these transitions. If I can't confidently 
label an image with a specific class, I choose not to annotate it. I hope this approach helps the model avoid confusion.
However, I worry that being overly cautious—where I can still discern the app but choose not to annotate—might be 
counterproductive.

I noticed that one app was consistently misclassified. After confirming that there were no mistakes in the annotations, 
I collected additional examples of this class to help the model improve its accuracy for this specific case.
 
## Conclusion

This project shows how computer vision could improve TV remote usability for older adults. Using object detection with the JeVois-A33 camera and YOLOv8, the system detects TV interfaces in real-time. This object detection system still needs to be connected to a microcontroller to get the benefits of automatic applications switching.

## References
- https://docs.cvat.ai/docs/manual/advanced/serverless-tutorial/
- https://docs.ultralytics.com/modes/predict/#boxes

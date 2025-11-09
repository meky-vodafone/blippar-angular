import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  AfterViewInit,
  viewChild,
  output,
  inject,
} from '@angular/core';
import 'aframe';
import 'aframe-extras';
import 'aframe-environment-component';
import { GameHeaderComponent } from './components/game-header/game-header.component';
import { ArGame } from './service/ar-game';
import { Subscription } from 'rxjs';

declare const WEBARSDK: any;

@Component({
  selector: 'app-blipp-ar-advanced',
  imports: [GameHeaderComponent],
  templateUrl: './blipp-ar-advanced.component.html',
  styleUrl: './blipp-ar-advanced.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BlippArAdvancedComponent implements AfterViewInit {
  arGameService = inject(ArGame);
  onGameComplete = output<{ caughtCharachter: boolean; timeTaken: number }>();
  sub!: Subscription;

  modelPath = '/models/yougo_1.glb';
  scriptPath = '/blippar-webar-sdk/webar-sdk/webar-sdk-v2.0.8.min.js';
  arModel = viewChild<ElementRef>('ar_model');
  CAMERA_CONFIG = {
    // Camera constraints for optimal AR performance
    VIDEO_CONSTRAINTS: {
      facingMode: 'environment', // Use rear camera
      advanced: [
        {
          focusMode: 'manual',
          focusDistance: 0,
        },
      ],
    },

    // Timing settings
    TIMING: {
      GYRO_CHECK_DELAY: 500, // ms to wait before checking gyro
      SDK_RETRY_INTERVAL: 250, // ms between SDK initialization retries
      VIDEO_TRANSITION_DELAY: 800, // ms before hiding loading screen
    },
  } as const;

  cameraStream: MediaStream | null = null;
  isSDKReady = false;
  hasGyroPermission = false;
  isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // DOM elements (cached for performance)
  videoElement: HTMLVideoElement | null = null;
  loadingScreen: HTMLElement | null = null;
  cameraPermissionDialog: HTMLElement | null = null;
  gyroPermissionDialog: HTMLElement | null = null;

  loadBlipparScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.scriptPath;
      script.async = true;

      // Set all the attributes
      script.setAttribute('webar-mode', 'surface-tracking');
      // script.setAttribute('on-progress', 'customProgressCallback');
      // script.setAttribute('on-error', 'customErrorCallback');
      script.setAttribute('auto-init', 'true');
      script.setAttribute('auto-start-tracking', 'true');
      script.setAttribute('minimal-ui', 'true');
      script.setAttribute('render-scene-on-desktop', 'false');
      script.setAttribute('external-camera-stream', 'true');
      script.setAttribute('debug-mode', 'false');
      script.onload = () => {
        resolve();
      };

      script.onerror = () => {
        reject();
      };
      document.head.appendChild(script);
    });
  }

  ngAfterViewInit(): void {
    this.loadBlipparScript()
      .then(() => {
        WEBARSDK.Init();
        // Start the initialization process when script loads
        this.initialize();
        console.log('✅ WebAR camera & permission handler loaded');

        // ============================================
        // SDK EVENT HANDLERS
        // ============================================

        /**
         * Called when WebAR SDK is ready
         */
        WEBARSDK.SetAppReadyCallback(() => {
          console.log('🎯 WebAR SDK is ready!');
          this.isSDKReady = true;

          // If camera is already available, initialize
          if (this.cameraStream) {
            this.initializeSDK();
          }

          this.onModelClickHandler();
        });

        /**
         * Called when SDK video has started
         */
        WEBARSDK.SetVideoStartedCallback(() => {
          console.log(
            '🎥 WebAR video started - transitioning from loading screen'
          );

          // // Stop any fallback progress animation
          // if (typeof stopFallbackProgress === 'function') {
          //   stopFallbackProgress();
          // }

          // Hide loading screen with smooth transition
          setTimeout(() => {
            this.hideLoadingScreenWithTransition();
            this.removeOriginalVideoElement();
          }, this.CAMERA_CONFIG.TIMING.VIDEO_TRANSITION_DELAY);
        });
      })
      .catch(() => {});

    console.log('📹 Loading WebAR camera & permission handler...');
  }

  // -----------------------
  // Initialization
  // -----------------------
  initialize() {
    // Cache DOM elements
    this.videoElement = document.getElementById(
      'video'
    ) as HTMLVideoElement | null;
    this.loadingScreen = document.getElementById('loadingscreen');
    this.cameraPermissionDialog = document.getElementById('camperms');
    this.gyroPermissionDialog = document.getElementById('gyroperms');

    // Start gyroscope permission detection
    this.initializeGyroPermissions();

    // Wait for A-Frame scene to finish loading
    const aframeScene = document.getElementById('mainScene');
    if (aframeScene) {
      aframeScene.addEventListener('loaded', this.onSceneLoaded);
      console.log('📱 Waiting for A-Frame scene to load...');
    } else {
      console.warn(
        '⚠️ A-Frame scene element not found, starting camera immediately'
      );
      this.onSceneLoaded();
    }
  }

  onSceneLoaded = () => {
    console.log('🎬 A-Frame scene loaded, starting camera setup...');
    this.initializeCameraPermissions();
  };

  // -----------------------
  // Camera permission & stream
  // -----------------------
  initializeCameraPermissions() {
    if (this.isIOS) {
      console.log('🍎 iOS detected - showing camera permission prompt');
      this.showCameraPermissionDialog();
    } else {
      console.log('🤖 Non-iOS platform - requesting camera access directly');
      this.startCameraStream();
    }
  }

  showCameraPermissionDialog() {
    if (this.cameraPermissionDialog) {
      this.cameraPermissionDialog.classList.remove('hide');
      this.cameraPermissionDialog.classList.add('showflex');

      // Add click handler for permission button
      const permissionButton = this.cameraPermissionDialog.querySelector(
        '.permsbutton'
      ) as HTMLElement | null;
      if (permissionButton) {
        permissionButton.addEventListener(
          'click',
          this.onCameraPermissionGranted,
          { once: true }
        );
      }
    }
  }

  onCameraPermissionGranted = () => {
    console.log('📷 Camera permission granted by user');
    this.hideCameraPermissionDialog();
    this.startCameraStream();
  };

  hideCameraPermissionDialog() {
    if (this.cameraPermissionDialog) {
      this.cameraPermissionDialog.classList.remove('showflex');
      this.cameraPermissionDialog.classList.add('hide');
    }
  }

  async startCameraStream() {
    console.log('🎥 Starting camera stream...');

    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('❌ getUserMedia not supported in this browser');
      return;
    }

    try {
      // Get available video input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === 'videoinput'
      );

      if (videoDevices.length > 0) {
        console.log(`📹 Found ${videoDevices.length} video device(s)`);

        // Use the last camera (usually rear camera on mobile)
        const selectedDevice = videoDevices[videoDevices.length - 1];
        console.log(
          '📱 Selected camera:',
          selectedDevice.label || 'Unknown camera'
        );

        // Add device ID to constraints if available
        if (selectedDevice.deviceId) {
          // clone constraints to keep constness
          const vc: any = { ...this.CAMERA_CONFIG.VIDEO_CONSTRAINTS };
          vc.deviceId = { exact: selectedDevice.deviceId };
          this.CAMERA_CONFIG = {
            ...this.CAMERA_CONFIG,
            VIDEO_CONSTRAINTS: vc,
          } as any;
        }
      }

      // Request camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        // Cast through unknown to satisfy TypeScript when using custom/advanced constraints
        video: this.CAMERA_CONFIG
          .VIDEO_CONSTRAINTS as unknown as MediaTrackConstraints,
      });

      console.log('✅ Camera stream started successfully');
      this.cameraStream = stream;

      // Assign stream to video element
      if (this.videoElement) {
        this.videoElement.srcObject = stream;
        // Try to autoplay (may require user gesture on some platforms)
        try {
          await this.videoElement.play();
        } catch (e) {
          // ignore autoplay errors; SDK will use the stream
        }
      }

      // Wait a bit then check motion sensor permissions
      setTimeout(
        () => this.initializeMotionPermissions(),
        this.CAMERA_CONFIG.TIMING.GYRO_CHECK_DELAY
      );
    } catch (error: any) {
      console.error('❌ Failed to start camera:', error);
      this.handleCameraError(error);
    }
  }

  handleCameraError(error: any) {
    console.error('Camera error details:', error);
    if (error?.name === 'NotAllowedError') {
      console.error('Camera permission denied');
    } else if (error?.name === 'NotFoundError') {
      console.error('No camera found');
    } else if (error?.name === 'NotReadableError') {
      console.error('Camera is in use by another application');
    }
  }

  // -----------------------
  // Motion sensor permissions (iOS)
  // -----------------------
  initializeGyroPermissions() {
    if (this.isIOS) {
      // On iOS, listen for device orientation events
      window.addEventListener(
        'deviceorientation',
        this.onGyroPermissionReceived as EventListener,
        { once: true } as AddEventListenerOptions
      );
    } else {
      // On other platforms, listen for device motion events
      window.addEventListener(
        'devicemotion',
        this.onMotionReceived as EventListener
      );
    }
  }

  initializeMotionPermissions() {
    console.log('🧭 Checking motion sensor permissions...');

    const requestFn = (DeviceMotionEvent as any)?.requestPermission;
    if (typeof requestFn === 'function') {
      // iOS 13+ requires explicit permission
      console.log('📱 iOS 13+ detected - showing motion permission prompt');
      this.showMotionPermissionDialog();
    } else {
      // Check if we already have motion data
      if (this.hasGyroPermission) {
        console.log('✅ Motion sensors already available');
        this.hideMotionPermissionDialog();
        this.initializeSDK();
      } else {
        console.log('⏳ Waiting for motion sensor data...');
        // Will be handled by event listeners set up in initializeGyroPermissions()
      }
    }
  }

  showMotionPermissionDialog() {
    if (this.gyroPermissionDialog) {
      this.gyroPermissionDialog.classList.remove('hide');
      this.gyroPermissionDialog.classList.add('showflex');

      const permissionButton = this.gyroPermissionDialog.querySelector(
        '.permsbutton'
      ) as HTMLElement | null;
      if (permissionButton) {
        permissionButton.addEventListener(
          'click',
          this.onMotionPermissionRequested,
          { once: true }
        );
      }
    }
  }

  onMotionPermissionRequested = async () => {
    console.log('🧭 Motion permission requested by user');

    try {
      const permission = await (DeviceMotionEvent as any).requestPermission();
      if (permission === 'granted') {
        console.log('✅ Motion permission granted');
        this.hasGyroPermission = true;
        this.hideMotionPermissionDialog();
        this.initializeSDK();
      } else {
        console.warn('⚠️ Motion permission denied');
        this.hideMotionPermissionDialog();
        // Continue without motion sensors
        this.initializeSDK();
      }
    } catch (error) {
      console.error('❌ Failed to request motion permission:', error);
      this.hideMotionPermissionDialog();
      this.initializeSDK();
    }
  };

  hideMotionPermissionDialog() {
    if (this.gyroPermissionDialog) {
      this.gyroPermissionDialog.classList.remove('showflex');
      this.gyroPermissionDialog.classList.add('hide');
    }
  }

  onGyroPermissionReceived = () => {
    console.log('🧭 Gyroscope permission detected');
    this.hasGyroPermission = true;
    window.removeEventListener(
      'deviceorientation',
      this.onGyroPermissionReceived as EventListener
    );

    // If camera is ready, initialize SDK
    if (this.cameraStream) {
      this.initializeSDK();
    }
  };

  onMotionReceived = (event: DeviceMotionEvent) => {
    if (
      (event as any).rotationRate?.alpha ||
      (event as any).rotationRate?.beta ||
      (event as any).rotationRate?.gamma
    ) {
      console.log('🧭 Motion sensor data received');
      this.hasGyroPermission = true;
      window.removeEventListener(
        'devicemotion',
        this.onMotionReceived as EventListener
      );

      // If camera is ready, initialize SDK
      if (this.cameraStream) {
        this.initializeSDK();
      }
    }
  };

  // -----------------------
  // WebAR SDK initialization
  // -----------------------
  initializeSDK() {
    console.log('🚀 Initializing WebAR SDK...');
    if (this.isSDKReady && this.cameraStream) {
      console.log('✅ SDK ready and camera available - starting AR');
      this.setCameraStreamOnSDK();
    } else if (this.isSDKReady) {
      console.log('⏳ SDK ready but waiting for camera...');
    } else if (this.cameraStream) {
      console.log('⏳ Camera ready but waiting for SDK...');
      // Keep trying until SDK is ready
      this.retrySDKInitialization();
    } else {
      console.log('⏳ Waiting for both SDK and camera...');
    }
  }

  retrySDKInitialization() {
    const retryInterval = setInterval(() => {
      if (this.isSDKReady) {
        clearInterval(retryInterval);
        this.initializeSDK();
      }
    }, this.CAMERA_CONFIG.TIMING.SDK_RETRY_INTERVAL);
  }

  setCameraStreamOnSDK() {
    console.log('� Setting camera stream on WebAR SDK...');

    try {
      WEBARSDK.SetCameraStream(this.cameraStream);
      console.log('✅ Camera stream successfully set on SDK');
    } catch (error) {
      console.error('❌ Failed to set camera stream on SDK:', error);
    }
  }

  // -----------------------
  // SDK event handlers helpers
  // -----------------------
  hideLoadingScreenWithTransition() {
    if (this.loadingScreen) {
      console.log('🎭 Hiding loading screen with fade transition');

      // Add fade out effect
      this.loadingScreen.style.transition = 'opacity 0.5s ease-out';
      this.loadingScreen.style.opacity = '0';

      // Remove from view after animation
      setTimeout(() => {
        this.loadingScreen?.classList.remove('showflex');
        this.loadingScreen?.classList.add('hide');
        this.arGameService.startTimer();
      }, 500);
    }
  }

  removeOriginalVideoElement() {
    // Keep the video element until the SDK confirms the camera is working
    if (this.videoElement) {
      console.log('🎥 Keeping video element active for camera preview');
      this.videoElement.style.position = 'fixed';
      this.videoElement.style.top = '0';
      this.videoElement.style.left = '0';
      this.videoElement.style.width = '100%';
      this.videoElement.style.height = '100%';
      this.videoElement.style.objectFit = 'cover';
      this.videoElement.style.zIndex = '-1';
    }
  }

  onModelClickHandler(): void {
    const model = this.arModel()?.nativeElement;
    if (!model) return;

    console.log('Model loaded and ready for interaction.');

    // Unified handler function
    const handleInteraction = (event: MouseEvent | TouchEvent) => {
      event.stopPropagation();
      event.preventDefault();
      debugger;
      console.log('Model Clicked');

      // model.setAttribute("scale", {
      //   x: 0,
      //   y: 0,
      //   z: 0,
      // });
      model.setAttribute('visible', false);
      this.onGameCompleteHandler(true);
      // Stop Timer
      // stopTimer();
      // showGameCompletePopup(true);
    };

    // Handle both click and touchstart
    model.addEventListener('click', handleInteraction);
    model.addEventListener('touchstart', handleInteraction);
  }
  onGameCompleteHandler(caughtCharachter: boolean = false): void {
    const model = this.arModel()?.nativeElement;
    model.setAttribute('visible', false);

    const timeTaken = caughtCharachter
      ? this.arGameService.time - this.arGameService.secondsLeft()
      : 0;
    this.onGameComplete.emit({
      caughtCharachter,
      timeTaken,
    });

  }
  ngOnInit(): void {
    this.arGameService.startTimer();
    this.sub = this.arGameService.timerCompleted$.subscribe(() => {
      this.onGameCompleteHandler(false);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

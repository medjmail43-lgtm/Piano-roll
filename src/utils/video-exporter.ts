import { VideoExportOptions } from '../types';

export interface ExportProgress {
  state: 'preparing' | 'recording' | 'encoding' | 'completed' | 'cancelled' | 'error';
  currentSecond: number;
  totalSeconds: number;
  progressPercent: number;
  errorMessage?: string;
  blob?: Blob;
  downloadUrl?: string;
}

export class VideoExporter {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isCancelled: boolean = false;

  public static getSupportedMimeType(preferMp4: boolean = false): { mimeType: string; extension: 'mp4' | 'webm' } {
    if (preferMp4) {
      const mp4Types = ['video/mp4; codecs=avc1,mp4a.40.2', 'video/mp4; codecs=avc1', 'video/mp4'];
      for (const t of mp4Types) {
        if (MediaRecorder.isTypeSupported(t)) {
          return { mimeType: t, extension: 'mp4' };
        }
      }
    }

    const webmTypes = [
      'video/webm; codecs=vp9,opus',
      'video/webm; codecs=vp8,opus',
      'video/webm; codecs=h264,opus',
      'video/webm',
    ];

    for (const t of webmTypes) {
      if (MediaRecorder.isTypeSupported(t)) {
        return { mimeType: t, extension: 'webm' };
      }
    }

    return { mimeType: '', extension: 'webm' };
  }

  public cancel(): void {
    this.isCancelled = true;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
  }

  public async exportVideo(
    canvas: HTMLCanvasElement,
    audioStream: MediaStream | null,
    options: VideoExportOptions,
    onProgress: (progress: ExportProgress) => void
  ): Promise<Blob> {
    this.isCancelled = false;
    this.recordedChunks = [];

    const { mimeType, extension } = VideoExporter.getSupportedMimeType(options.format === 'mp4');

    if (!mimeType) {
      throw new Error('Your browser does not support MediaRecorder video capture.');
    }

    // 1. Capture canvas stream at specified FPS
    const canvasStream = canvas.captureStream(options.fps);
    const combinedStream = new MediaStream();

    // Add video track
    canvasStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));

    // Add audio track if requested and available
    if (options.includeAudio && audioStream) {
      audioStream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
    }

    const bitrateBps = (options.bitrateMbps || 12) * 1000000;

    const recorderOptions: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: bitrateBps,
    };

    try {
      this.mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
    } catch {
      // Fallback without bitrate constraint if browser complains
      this.mediaRecorder = new MediaRecorder(combinedStream);
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Failed to initialize MediaRecorder'));
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        // Clean up stream tracks
        combinedStream.getTracks().forEach((t) => t.stop());

        if (this.isCancelled) {
          onProgress({
            state: 'cancelled',
            currentSecond: 0,
            totalSeconds: 0,
            progressPercent: 0,
          });
          return reject(new Error('Video export was cancelled.'));
        }

        const finalBlob = new Blob(this.recordedChunks, { type: mimeType });
        const downloadUrl = URL.createObjectURL(finalBlob);

        onProgress({
          state: 'completed',
          currentSecond: options.endTime - options.startTime,
          totalSeconds: options.endTime - options.startTime,
          progressPercent: 100,
          blob: finalBlob,
          downloadUrl,
        });

        resolve(finalBlob);
      };

      this.mediaRecorder.onerror = (e) => {
        combinedStream.getTracks().forEach((t) => t.stop());
        reject(e);
      };

      // Start recording with 1000ms timeslices
      this.mediaRecorder.start(1000);

      onProgress({
        state: 'recording',
        currentSecond: 0,
        totalSeconds: options.endTime - options.startTime,
        progressPercent: 0,
      });
    });
  }

  public downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import fft from "fft-js";
import {
  LevaPanel,
  button,
  buttonGroup,
  folder,
  useControls,
  useCreateStore,
} from "leva";
import * as THREE from "three";
import AudioInput from "../components/AudioInput";
import { SoundscapePreview } from "../components/SoundscapePreview";
import { useFullscreenPreviewStore, usePreviewExportStore } from "../store";
import { exportHighQualityCanvas } from "../utils/canvasExporter";
import { exportSoundscapeAsGltf } from "../utils/gltfExporter";
import { buildAndDownloadSoundscapePackage } from "../utils/packageBuilder";

const STANDARD_NUM_CHUNKS = 200;
const STANDARD_SOUNDSCAPE_LENGTH = 200;

type AudioContextCtor = typeof AudioContext;
type OfflineAudioContextCtor = typeof OfflineAudioContext;
type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: AudioContextCtor;
    webkitOfflineAudioContext?: OfflineAudioContextCtor;
  };

async function analyseAudioFile(
  file: File,
  options?: { keepCount?: number; numChunks?: number },
): Promise<{ data: number[][]; duration: number }> {
  const keepCount = options?.keepCount ?? 48;
  const numChunks = options?.numChunks ?? 200;

  const arrayBuffer = await file.arrayBuffer();

  const audioWindow = window as AudioWindow;
  const AudioCtx = audioWindow.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioCtx) {
    throw new Error("AudioContext is not available in this browser.");
  }
  const audioContext = new AudioCtx();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // resampling/converting to mono 44100Hz before analysis.
  const targetSampleRate = 44100;
  const targetChannels = 1;

  let processedBuffer = audioBuffer;
  if (
    audioBuffer.sampleRate !== targetSampleRate ||
    audioBuffer.numberOfChannels !== targetChannels
  ) {
    const OfflineCtx =
      audioWindow.OfflineAudioContext || audioWindow.webkitOfflineAudioContext;
    if (!OfflineCtx) {
      throw new Error("OfflineAudioContext is not available in this browser.");
    }
    const offlineCtx = new OfflineCtx(
      targetChannels,
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate,
    );
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    processedBuffer = await offlineCtx.startRendering();
  }

  const channelData = processedBuffer.getChannelData(0);
  const totalSamples = channelData.length;

  const fftSize = 1024;
  const halfFFT = fftSize / 2;
  const frequenciesPerChunk: number[][] = [];

  const samplesPerChunk = Math.floor(totalSamples / numChunks);

  for (let i = 0; i < numChunks; i++) {
    const startSample = i * samplesPerChunk;
    const endSample =
      i === numChunks - 1 ? totalSamples : (i + 1) * samplesPerChunk;
    const segment = channelData.slice(startSample, endSample);

    const chunkFFTData: number[][] = [];
    for (let j = 0; j < segment.length; j += fftSize) {
      const chunk = segment.slice(j, j + fftSize);
      const padded = new Float32Array(fftSize);
      padded.set(chunk);

      const phasors = fft.fft(padded);
      const magnitudes = (fft.util.fftMag(phasors) as number[]).slice(
        0,
        halfFFT,
      );

      chunkFFTData.push(magnitudes);
    }

    if (!chunkFFTData.length) continue;

    const averaged = chunkFFTData[0].map(
      (_, idx) =>
        chunkFFTData.reduce((sum, arr) => sum + arr[idx], 0) /
        chunkFFTData.length,
    );

    const cropped = averaged.slice(0, keepCount);
    const padded = [0, ...cropped, 0];

    frequenciesPerChunk.push(extendArrays(padded));
  }

  if (!frequenciesPerChunk.length) {
    return { data: [], duration: processedBuffer.duration };
  }

  const arrayLength = frequenciesPerChunk[0].length;
  const zeroArray = Array(arrayLength).fill(0);
  const outputData = [zeroArray, ...frequenciesPerChunk, zeroArray];

  return { data: outputData, duration: processedBuffer.duration };
}

function extendArrays(data: number[] = []) {
  const extended: number[] = [];
  const amplifiedData = amplifyArray(data, 2);

  for (let i = 0; i < amplifiedData.length - 1; i++) {
    extended.push(data[i]);
    const midpoint = (data[i] + data[i + 1]) / 2;
    extended.push(midpoint);
  }
  extended.push(data[data.length - 1]);
  return extended;
}

function amplifyArray(arr: number[], factor = 1) {
  return arr.map((value) => Math.pow(value, factor));
}

function blurActiveElement() {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

export interface NumChunksConfirmationControlsProps {
  store: ReturnType<typeof useCreateStore>;
  currentNumChunks: number;
  pendingNumChunks: number;
  onConfirm: () => void;
  onDiscard: () => void;
}

function NumChunksConfirmationControls({
  store,
  currentNumChunks,
  pendingNumChunks,
  onConfirm,
  onDiscard,
}: NumChunksConfirmationControlsProps) {
  const confirmationId = `${currentNumChunks}-${pendingNumChunks}`;

  useControls(
    "Soundscape Controls",
    () => ({
      Analysis: folder({
        [`numChunksConfirmationMessage${confirmationId}`]: {
          value: `Regenerate from ${currentNumChunks} to ${pendingNumChunks} chunks?`,
          editable: false,
          rows: 2,
          label: "",
          order: -90,
        },
        [`numChunksConfirmationActions${confirmationId}`]: {
          ...buttonGroup({
            label: null,
            opts: {
              Yes: onConfirm,
              No: onDiscard,
            },
          }),
          order: -80,
        },
      }),
    }),
    { store },
    [currentNumChunks, onConfirm, onDiscard, pendingNumChunks],
  );

  return null;
}

export default function GenerateJSON() {
  const [, setOutputJson] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<number[][] | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingGltf, setIsExportingGltf] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [generatedNumChunks, setGeneratedNumChunks] =
    useState(STANDARD_NUM_CHUNKS);
  const isFullscreenPreviewOpen = useFullscreenPreviewStore(
    (s) => s.isFullscreenPreviewOpen,
  );
  const setFullscreenPreviewOpen = useFullscreenPreviewStore(
    (s) => s.setFullscreenPreviewOpen,
  );
  const previewCanvas = usePreviewExportStore((s) => s.canvas);
  const previewRenderer = usePreviewExportStore((s) => s.renderer);
  const previewScene = usePreviewExportStore((s) => s.scene);
  const previewCamera = usePreviewExportStore((s) => s.camera);
  const levaStore = useCreateStore();
  const [showLevaNumchunksPopup, setShowLevaNumchunksPopup] = useState(false);
  const [pendingNumChunks, setPendingNumChunks] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const levaContainerRef = useRef<HTMLDivElement | null>(null);
  const [
    {
      numChunks,
      amplifyFactor,
      soundscapeLength,
      reverseOutput,
      leftTopColor,
      leftBottomColor,
      rightTopColor,
      rightBottomColor,
      gradientLeftToRight,
      showPlaybackLine,
      showPlayedLines,
      showHoverLine,
    },
    setControls,
    getControls,
  ] = useControls(
    "Soundscape Controls",
    () => ({
      Analysis: folder({
        numChunks: {
          value: STANDARD_NUM_CHUNKS,
          min: 50,
          max: 1000,
          step: 10,
          order: -100,
          transient: false,
          onChange: (value, _path, context) => {
            if (context.initial || !selectedFile) return;

            if (value === generatedNumChunks) {
              setPendingNumChunks(null);
              setShowLevaNumchunksPopup(false);
              return;
            }

            setPendingNumChunks(value);
            setShowLevaNumchunksPopup(true);
          },
        },
        soundscapeLength: {
          value: STANDARD_SOUNDSCAPE_LENGTH,
          min: 50,
          max: 1000,
          step: 10,
        },
        amplifyFactor: {
          value: 0.6,
          min: 0.01,
          max: 1.5,
          step: 0.01,
        },
        reverseOutput: {
          value: false,
          label: "Reverse output (right to left)",
        },
      }),
      Appearance: folder({
        leftTopColor: "#aa00ff",
        leftBottomColor: "#2f0f45",
        rightTopColor: "#f20099",
        rightBottomColor: "#5c1f7d",
        gradientLeftToRight: false,
      }),
      Overlays: folder({
        showPlaybackLine: true,
        showPlayedLines: true,
        showHoverLine: true,
      }),
    }),
    { store: levaStore },
    [generatedNumChunks, selectedFile],
  );

  const regenerateSoundscape = useCallback(
    async (file: File, chunkCount: number) => {
      setError(null);
      setIsProcessing(true);

      try {
        const { data, duration } = await analyseAudioFile(file, {
          numChunks: chunkCount,
        });
        setAnalysis(data);
        setDuration(duration);
        setGeneratedNumChunks(chunkCount);
        setOutputJson(JSON.stringify(data, null, 2));
      } catch (e) {
        console.error(e);
        setError("Failed to analyse audio.");
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const handleAudioSelected = (file: File) => {
    setError(null);
    setOutputJson("");
    setAnalysis(null);
    setDuration(null);
    setCurrentTime(0);
    setFullscreenPreviewOpen(true);
    setShowLevaNumchunksPopup(false);
    setPendingNumChunks(null);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setSelectedFile(file);

    // prepare audio element immediately so we can play later
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(url);
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    void regenerateSoundscape(file, numChunks);
  };

  const handleConfirmNumChunks = useCallback(() => {
    if (!selectedFile || pendingNumChunks === null || isProcessing) return;

    const nextNumChunks = pendingNumChunks;
    setShowLevaNumchunksPopup(false);
    setPendingNumChunks(null);
    blurActiveElement();
    void regenerateSoundscape(selectedFile, nextNumChunks);
  }, [
    isProcessing,
    pendingNumChunks,
    regenerateSoundscape,
    selectedFile,
  ]);

  const handleDiscardNumChunks = useCallback(() => {
    setShowLevaNumchunksPopup(false);
    setPendingNumChunks(null);
    setControls({ numChunks: generatedNumChunks });
    blurActiveElement();
  }, [generatedNumChunks, setControls]);

  useEffect(() => {
    const container = levaContainerRef.current;
    if (!container) return;

    let frameId = 0;
    const refreshExpandedFolderHeights = () => {
      frameId = window.requestAnimationFrame(() => {
        const confirmationMessage = Array.from(
          container.querySelectorAll<HTMLDivElement>("div"),
        ).find(
          (element) =>
            element.childElementCount === 0 &&
            element.textContent?.trim().startsWith("Regenerate from "),
        );
        const confirmationRow = confirmationMessage?.parentElement;
        confirmationRow?.classList.add("num-chunks-confirmation-message");

        container
          .querySelectorAll<HTMLElement>('div[style*="height"]')
          .forEach((wrapper) => {
            const content = wrapper.firstElementChild;
            if (
              wrapper.style.height === "0px" ||
              !(content instanceof HTMLElement) ||
              window.getComputedStyle(content).display !== "grid"
            ) {
              return;
            }

            wrapper.style.removeProperty("height");
            wrapper.style.removeProperty("overflow");
          });
      });
    };

    const observer = new MutationObserver(refreshExpandedFolderHeights);
    observer.observe(container, { childList: true, subtree: true });
    refreshExpandedFolderHeights();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [isFullscreenPreviewOpen, pendingNumChunks, showLevaNumchunksPopup]);

  const handlePlayPause = useCallback(() => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isEditable =
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        tagName === "BUTTON";

      if (isEditable || !audioUrl || !analysis) {
        return;
      }

      event.preventDefault();
      handlePlayPause();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [analysis, audioUrl, handlePlayPause]);

  const handleSeek = useCallback(
    (clickTime: number) => {
      if (audioRef.current && duration) {
        const seekTime = (clickTime / (analysis?.length || 1)) * duration;
        if (!reverseOutput) {
          audioRef.current.currentTime =
            duration - Math.max(0, Math.min(seekTime, duration));
        } else {
          audioRef.current.currentTime = Math.max(
            0,
            Math.min(seekTime, duration),
          );
        }

        setCurrentTime(audioRef.current.currentTime);
      }
    },
    [analysis?.length, duration, reverseOutput],
  );

  useEffect(() => {
    let frameId: number;

    const updateTime = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      frameId = requestAnimationFrame(updateTime);
    };

    if (isPlaying) {
      frameId = requestAnimationFrame(updateTime);
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [isPlaying]);

  const totalChunks = analysis?.length ?? 0;
  const appliedNumChunks = analysis ? generatedNumChunks : numChunks;
  const zSpacing = soundscapeLength / Math.max(1, appliedNumChunks);

  // scale raw data to reasonable height and also produce vectors
  const { soundLinesVectors, scaledLists } = useMemo(() => {
    if (!analysis)
      return {
        soundLinesVectors: [] as THREE.Vector3[][],
        scaledLists: [] as number[][],
      };
    // optionally amplify values; larger amplifyFactor should yield a taller model
    let tempAmplified = null;
    if (!reverseOutput) {
      tempAmplified = analysis
        .map((row) => row.map((y) => Math.pow(y, amplifyFactor)))
        .reverse();
    } else {
      tempAmplified = analysis.map((row) =>
        row.map((y) => Math.pow(y, amplifyFactor)),
      );
    }
    const amplified = tempAmplified;
    // instead of normalizing to a constant height, simply multiply by an overall
    // constant so that increasing amplifyFactor makes the mesh visibly larger
    const baseHeight = 3; // adjust if the mesh is too tall/short
    const scaleFactor = amplifyFactor * baseHeight;
    const zOffset = ((analysis.length || 0) - 1) * zSpacing * 0.5;
    const scaled = amplified.map((row) => row.map((y) => y * scaleFactor));
    const vectors = scaled.map((row, t) =>
      row.map(
        (y, x) =>
          new THREE.Vector3(x - row.length / 2, y, t * zSpacing - zOffset),
      ),
    );
    if (!reverseOutput) {
      return { soundLinesVectors: vectors.reverse(), scaledLists: scaled };
    } else {
      return { soundLinesVectors: vectors, scaledLists: scaled };
    }
  }, [amplifyFactor, analysis, reverseOutput, zSpacing]);

  const handleExport = async () => {
    if (!selectedFile || !analysis || duration === null) return;

    setError(null);
    setIsExporting(true);

    try {
      await buildAndDownloadSoundscapePackage({
        sourceFile: selectedFile,
        analysis,
        duration,
      });
    } catch (e) {
      console.error(e);
      setError("Failed to export package.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportGltf = async () => {
    if (!selectedFile || !scaledLists.length) return;

    setError(null);
    setIsExportingGltf(true);

    try {
      await exportSoundscapeAsGltf({
        lists: scaledLists,
        zSpacing,
        fileName: `${selectedFile.name.replace(/\.[^/.]+$/, "") || "soundscape"}.glb`,
        leftTopColor,
        leftBottomColor,
        rightTopColor,
        rightBottomColor,
        gradientLeftToRight,
      });
    } catch (e) {
      console.error(e);
      setError("Failed to export 3D model.");
    } finally {
      setIsExportingGltf(false);
    }
  };

  const handleExportImage = async () => {
    if (
      !selectedFile ||
      !previewCanvas ||
      !previewRenderer ||
      !previewScene ||
      !previewCamera
    ) {
      return;
    }

    setError(null);
    setIsExportingImage(true);

    try {
      await exportHighQualityCanvas({
        sourceCanvas: previewCanvas,
        renderer: previewRenderer,
        scene: previewScene,
        camera: previewCamera,
        fileName: `${selectedFile.name.replace(/\.[^/.]+$/, "") || "soundscape"}.png`,
      });
    } catch (e) {
      console.error(e);
      setError("Failed to export image.");
    } finally {
      setIsExportingImage(false);
    }
  };

  useControls(
    "Soundscape Controls",
    () => ({
      Actions: folder({
        swapGradientSides: button(() => {
          const currentLeftTopColor = getControls("leftTopColor");
          const currentLeftBottomColor = getControls("leftBottomColor");
          const currentRightTopColor = getControls("rightTopColor");
          const currentRightBottomColor = getControls("rightBottomColor");

          setControls({
            leftTopColor: currentRightTopColor,
            leftBottomColor: currentRightBottomColor,
            rightTopColor: currentLeftTopColor,
            rightBottomColor: currentLeftBottomColor,
          });
          blurActiveElement();
        }),
        exportPackage: button(() => {
          if (isExporting) return;
          void handleExport();
          blurActiveElement();
        }),
        export3DModel: button(() => {
          if (isExportingGltf) return;
          void handleExportGltf();
          blurActiveElement();
        }),
        downloadHighQualityImage: button(() => {
          if (isExportingImage) return;
          void handleExportImage();
          blurActiveElement();
        }),
      }),
    }),
    { store: levaStore },
    [
      getControls,
      handleExport,
      handleExportGltf,
      handleExportImage,
      isExporting,
      isExportingGltf,
      isExportingImage,
      setControls,
    ],
  );

  return (
    <main className="app-root flex items-center justify-center min-h-screen p-4">
      {showLevaNumchunksPopup && pendingNumChunks !== null && (
        <NumChunksConfirmationControls
          key={`${generatedNumChunks}-${pendingNumChunks}`}
          store={levaStore}
          currentNumChunks={generatedNumChunks}
          pendingNumChunks={pendingNumChunks}
          onConfirm={handleConfirmNumChunks}
          onDiscard={handleDiscardNumChunks}
        />
      )}
      {analysis && totalChunks > 0 && isFullscreenPreviewOpen && (
        <SoundscapePreview
          soundLinesVectors={soundLinesVectors}
          scaledLists={scaledLists}
          zSpacing={zSpacing}
          fullscreen
          selectedFileName={selectedFile?.name}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration || 1}
          onSeek={handleSeek}
          onTogglePlayPause={handlePlayPause}
          reverseOutput={reverseOutput}
          leftTopColor={leftTopColor}
          leftBottomColor={leftBottomColor}
          rightTopColor={rightTopColor}
          rightBottomColor={rightBottomColor}
          gradientLeftToRight={gradientLeftToRight}
          showPlaybackLine={showPlaybackLine}
          showPlayedLines={showPlayedLines}
          showHoverLine={showHoverLine}
        />
      )}
      {isFullscreenPreviewOpen && (
        <div
          ref={levaContainerRef}
          className={`fixed top-4 left-4 z-20 leva-container ${
            showLevaNumchunksPopup ? "show-num-chunks-confirmation" : ""
          }`}
        >
          <LevaPanel
            store={levaStore}
            collapsed={false}
            oneLineLabels
          />
        </div>
      )}
      <div className="app-content mb-24">
        <h1 className="mb-5" style={{ fontSize: "4rem" }}>
          Generate Soundscape
        </h1>
        <p>
          Upload an audio file to generate JSON data and preview the resulting
          soundscape below.
        </p>

        <AudioInput onAudioSelected={handleAudioSelected} />

        {isProcessing && <p>Processing audio…</p>}
        {error && <p>{error}</p>}

        {/* {analysis && totalChunks > 0 && (
          <div className="visual-section">
            <div className="output-json">
              <pre>{outputJson}</pre>
            </div>
          </div>
        )} */}
      </div>
    </main>
  );
}

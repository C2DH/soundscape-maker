import type { ElementRef } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { RootState } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import type { Mesh } from "three";
import * as THREE from "three";
import AudioVisualizer from "./AudioVisualizer";
import HoverLine from "./HoverLine";
import SoundScape from "./SoundScape";
import PlaySign from "./svg/PlaySign";
import PauseSign from "./svg/PauseSign";
import { ArrowLeft } from "iconoir-react";

import {
  useFullscreenPreviewStore,
  useMeshStore,
  useOrbitStore,
  usePreviewExportStore,
  useThemeStore,
} from "../store";

const isMobile =
  typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);

export interface SoundscapePreviewProps {
  soundLinesVectors: THREE.Vector3[][];
  scaledLists: number[][];
  zSpacing: number;
  fullscreen?: boolean;
  selectedFileName?: string;
  isPlaying?: boolean;
  currentTime: number;
  duration: number;
  onSeek: (clickTime: number) => void;
  onTogglePlayPause?: () => void;
  reverseOutput: boolean;
  leftTopColor: string;
  leftBottomColor: string;
  rightTopColor: string;
  rightBottomColor: string;
  gradientLeftToRight: boolean;
  showPlaybackLine: boolean;
  showPlayedLines: boolean;
  showHoverLine: boolean;
}

export function SoundscapePreview({
  soundLinesVectors,
  scaledLists,
  zSpacing,
  fullscreen = false,
  selectedFileName,
  isPlaying = false,
  currentTime,
  duration,
  onSeek,
  onTogglePlayPause,
  reverseOutput,
  leftTopColor,
  leftBottomColor,
  rightTopColor,
  rightBottomColor,
  gradientLeftToRight,
  showPlaybackLine,
  showPlayedLines,
  showHoverLine,
}: SoundscapePreviewProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const orbitRef = useRef<ElementRef<typeof OrbitControls> | null>(null);
  const setMesh = useMeshStore((s) => s.setMesh);
  const setOrbit = useOrbitStore((s) => s.setOrbit);
  const setPreviewExport = usePreviewExportStore((s) => s.setPreviewExport);
  const clearPreviewExport = usePreviewExportStore((s) => s.clearPreviewExport);
  const toggleFullscreenPreview = useFullscreenPreviewStore(
    (s) => s.toggleFullscreenPreview,
  );
  const target = useOrbitStore((s) => s.target);
  const gridColor = useThemeStore((s) => s.colors["--light"]);

  const handleMeshHover = useCallback((newHoverIndex: number | null) => {
    setHoverIndex((currentHoverIndex) =>
      currentHoverIndex === newHoverIndex ? currentHoverIndex : newHoverIndex,
    );
  }, []);

  const handleMeshClick = useCallback(
    (_clickIndex: number, clickTime: number) => {
      onSeek(clickTime);
    },
    [onSeek],
  );

  useEffect(() => {
    if (meshRef.current) {
      setMesh(meshRef.current);
    }
  }, [setMesh]);

  useEffect(() => {
    if (meshRef.current && orbitRef.current) {
      const controls = orbitRef.current;
      setOrbit(
        controls.object.position.toArray() as [number, number, number],
        controls.target.toArray() as [number, number, number],
      );
    }
  }, [setOrbit]);

  useEffect(() => clearPreviewExport, [clearPreviewExport]);

  const handleCanvasCreated = useCallback(
    ({ gl, scene, camera }: RootState) => {
      setPreviewExport(gl.domElement, gl, scene, camera);
    },
    [setPreviewExport],
  );

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "00:00";
    }

    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  return (
    <div
      className={
        fullscreen ? "soundscape-fullscreen-overlay" : "soundscape-preview"
      }
    >
      {fullscreen && selectedFileName && (
        <div className="flex absolute top-2 left-2 items-center  z-12">
          <button
            type="button"
            className="soundscape-fullscreen-playback w-[60px!important]"
            onClick={toggleFullscreenPreview}
          >
            <ArrowLeft
              className="absolute"
              width={30}
              color="rgba(var(--light),1)"
            />
          </button>
          <div
            style={{
              padding: "0.45rem 0.7rem",
              borderRadius: "0.5rem",
              color: "white",
              textAlign: "left",
            }}
          >
            <strong>Selected file:</strong>
            <br />
            <h1 className="uppercase font-bold">{selectedFileName}</h1>
          </div>
        </div>
      )}
      {fullscreen && onTogglePlayPause && (
        <div
          style={{
            position: "absolute",
            bottom: "3rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 12,
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span
            className="soundscape-fullscreen-playback"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              backgroundColor: "transparent",
            }}
          >
            {formatTime(currentTime)}
          </span>
          <button
            type="button"
            className="soundscape-fullscreen-playback"
            onClick={onTogglePlayPause}
            style={{
              backgroundColor: "rgba(var(--light), 0.4)",
              border: "1px solid rgba(var(--accent), 1)",
              margin: "0 0.5rem",
            }}
          >
            {isPlaying ? (
              <PauseSign width={20} color="rgba(var(--light),1)" />
            ) : (
              <PlaySign width={20} color="rgba(var(--light),1)" />
            )}
          </button>
          <span
            className="soundscape-fullscreen-playback "
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              backgroundColor: "transparent",
            }}
          >
            {formatTime(duration)}
          </span>
        </div>
      )}
      <Canvas
        shadows
        onCreated={handleCanvasCreated}
        camera={{
          position: [300, 200, 150],
          fov: 20,
          far: 1500,
          near: 0.1,
          zoom: isMobile ? 0.5 : 1,
        }}
        touch-action="none"
      >
        <OrbitControls
          ref={orbitRef}
          minDistance={isMobile ? 120 : 40}
          maxDistance={isMobile ? 700 : 600}
          target={target}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
        />

        <group>
          <SoundScape
            ref={meshRef}
            lists={scaledLists}
            zSpacing={zSpacing}
            position={[0, 0, 0]}
            onHover={handleMeshHover}
            onClick={handleMeshClick}
            leftTopColor={leftTopColor}
            leftBottomColor={leftBottomColor}
            rightTopColor={rightTopColor}
            rightBottomColor={rightBottomColor}
            gradientLeftToRight={gradientLeftToRight}
          />
          <Grid
            args={[164, 164]}
            cellSize={5}
            cellColor={gridColor}
            sectionSize={82}
            sectionColor={gridColor}
            fadeDistance={600}
            fadeStrength={1}
            position={[0, -0.2, 0]}
          />
        </group>

        <AudioVisualizer
          soundLinesVectors={soundLinesVectors}
          currentTime={currentTime}
          duration={duration}
          showPlaybackLine={showPlaybackLine}
          showPlayedLines={showPlayedLines}
        />
        <HoverLine
          soundLinesVectors={soundLinesVectors}
          hoverIndex={hoverIndex}
          duration={duration}
          reverseOutput={reverseOutput}
          visible={showHoverLine}
        />
      </Canvas>
    </div>
  );
}

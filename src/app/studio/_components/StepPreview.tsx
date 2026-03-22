"use client";

import { Download } from "lucide-react";
import { useStudio } from "../_state/context";

export function StepPreview() {
  const { s } = useStudio();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Preview & Download</h2>
      <p className="text-sm text-muted-foreground">
        Review all generated scene assets. Download individual clips or
        combine them using a video editor.
      </p>

      <div className="space-y-6">
        {s.scenes.map((scene, i) => (
          <div
            key={scene.id}
            className="bg-muted/20 border border-border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-emerald-400">
                Scene {i + 1}
              </span>
              <span className="text-xs text-muted-foreground">
                {scene.voiceoverScript}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Video */}
              <div>
                {scene.videos[0] ? (
                  <div className="space-y-1">
                    <video
                      src={scene.videos[0].url}
                      controls
                      className="w-full rounded"
                    />
                    <a
                      href={scene.videos[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Download size={12} /> Download clip
                    </a>
                  </div>
                ) : scene.images[0] ? (
                  <img
                    src={scene.images[0]}
                    alt={`Scene ${i + 1}`}
                    className="w-full rounded"
                  />
                ) : (
                  <div className="h-32 bg-muted rounded flex items-center justify-center text-muted-foreground text-sm">
                    No media
                  </div>
                )}
              </div>

              {/* Script + Guide */}
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Script</p>
                  <p className="text-sm">{scene.voiceoverScript}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Guide</p>
                  <p className="text-sm italic">{scene.voiceoverGuide}</p>
                </div>
              </div>

              {/* Audio */}
              <div>
                {scene.audioUrl ? (
                  <audio
                    src={scene.audioUrl}
                    controls
                    className="w-full"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No audio generated
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {s.scenes.some((sc) => sc.videos.length > 0) && (
        <div className="bg-muted/30 rounded-md p-4">
          <p className="text-sm text-muted-foreground">
            To combine clips into a final video, download each clip above and
            use a video editor (CapCut, Premiere, DaVinci Resolve) or ffmpeg
            to concatenate them with the audio tracks.
          </p>
        </div>
      )}
    </div>
  );
}

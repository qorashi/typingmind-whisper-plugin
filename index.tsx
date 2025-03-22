// index.tsx
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function WhisperTranscriber() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [segments, setSegments] = useState<{ time: string; text: string }[]>([]);
  const [error, setError] = useState<string>("");

  const handleTranscribe = async () => {
    setLoading(true);
    setSegments([]);
    setError("");

    try {
      const formData = new FormData();

      if (file) {
        formData.append("file", file);
      } else if (url) {
        const res = await fetch(url);
        const blob = await res.blob();
        formData.append("file", blob, "uploadedfile.mp3");
      } else {
        setError("Please upload a file or enter a URL.");
        setLoading(false);
        return;
      }

      formData.append("model", "whisper-1");
      formData.append("response_format", "srt");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Failed to transcribe audio.");
      }

      const srtText = await response.text();
      const parsedSegments = parseSRT(srtText);
      setSegments(parsedSegments);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const parseSRT = (srt: string) => {
    const lines = srt.split("\n");
    const result = [];
    let time = "";
    let text = "";

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("-->") && i + 1 < lines.length) {
        time = lines[i].split(" --> ")[0].trim();
        text = lines[i + 1];
        result.push({ time, text });
        i++; // skip the next line as it's already used
      }
    }

    return result;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input type="file" accept="audio/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Input placeholder="Or paste file URL here..." value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button onClick={handleTranscribe} disabled={loading}>
          {loading ? "Transcribing..." : "Get Transcript"}
        </Button>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {segments.length > 0 && (
        <div className="space-y-4">
          {segments.map((seg, index) => (
            <Card key={index}>
              <CardContent>
                <p className="text-sm text-gray-500">{seg.time}</p>
                <p>{seg.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
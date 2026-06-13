"use client";

interface InfoPanelProps {
  title: string;
  description: string;
  credit: { name: string; url: string };
  subtopics: string[];
  onSubtopicClick?: (topic: string) => void;
}

export default function InfoPanel({
  title,
  description,
  credit,
  subtopics,
  onSubtopicClick,
}: InfoPanelProps) {
  return (
    <div className="info-panel">
      <h2 className="info-panel-title">{title}</h2>
      <p className="info-panel-description">{description}</p>

      {subtopics.length > 0 && (
        <div className="info-panel-subtopics">
          {subtopics.map((topic, i) => (
            <button
              key={i}
              type="button"
              className="info-panel-subtopic info-panel-subtopic--clickable"
              onClick={(e) => {
                e.stopPropagation();
                onSubtopicClick?.(topic);
              }}
            >
              {topic}
            </button>
          ))}
        </div>
      )}

      <p className="info-panel-credit">
        Photo by{" "}
        <a href={credit.url} target="_blank" rel="noopener noreferrer">
          {credit.name}
        </a>
      </p>
    </div>
  );
}
